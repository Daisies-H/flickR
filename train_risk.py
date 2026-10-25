import os
import glob
import time
import numpy as np
import pandas as pd
import geopandas as gpd
import joblib
from scipy.spatial import cKDTree
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import roc_auc_score, average_precision_score
from sklearn.inspection import permutation_importance
from sklearn.utils.class_weight import compute_sample_weight

HERE = os.path.dirname(os.path.abspath(__file__))
t0 = time.time()


def load(name):
    hits = glob.glob(os.path.join(HERE, "**", name), recursive=True)
    g = gpd.read_file(hits[0])
    g = g[g.geometry.notna()].reset_index(drop=True)
    return g.to_crs(32617)          # meters, so distances are real


def xy(g):
    return np.column_stack([g.geometry.x.values, g.geometry.y.values])


print("Loading map layers...")
poles = load("Pole_Clip.shp")
dmg = load("arcos_prod_damage_09_28_Clip.shp")
cust = load("Customer_Clip.shp")
xfmr = load("Transformer_Clip.shp")
prot = pd.concat([load("Fuse_Bank_Clip.shp"), load("Recloser_Bank_Clip.shp")])

P = xy(poles)

# ---------- 1. Features: facts about each pole ----------
X = pd.DataFrame(index=poles.index)

# age in years (1900 dates are placeholders, so treat them as missing)
d = pd.to_datetime(poles["date_manuf"], errors="coerce")
d = d.fillna(pd.to_datetime(poles["date_insta"], errors="coerce"))
d = d.where(d.dt.year > 1905)
X["age_years"] = (pd.Timestamp.today() - d).dt.days / 365.25

X["height_ft"] = poles["height"].astype(str).str.extract(r"(\d+)")[0].astype(float)
X["pole_class"] = pd.to_numeric(poles["class"], errors="coerce")
X["material"] = poles["material"].astype("category").cat.codes
X["treatment"] = poles["treatment"].astype("category").cat.codes
X["reinforced"] = poles["reinforcem"].notna().astype(int)

# what is around the pole
X["poles_100m"] = cKDTree(P).query_ball_point(P, r=100, return_length=True)
X["customers_200m"] = cKDTree(xy(cust)).query_ball_point(P, r=200, return_length=True)
X["transformers_200m"] = cKDTree(xy(xfmr)).query_ball_point(P, r=200, return_length=True)
X["dist_protective_m"] = cKDTree(xy(prot)).query(P)[0]
X["dist_transformer_m"] = cKDTree(xy(xfmr)).query(P)[0]

# ---------- 2. Label: was damage recorded within 50 m of this pole? ----------
dist_to_damage = cKDTree(xy(dmg)).query(P)[0]
y = (dist_to_damage <= 50).astype(int)
print(f"Poles: {len(X)} | with nearby damage: {y.sum()} ({y.mean()*100:.2f}%)")

# ---------- 3. Split by map block so the test is honest ----------
blocks = (P[:, 0] // 3000).astype(int) * 100000 + (P[:, 1] // 3000).astype(int)
train_i, test_i = next(GroupShuffleSplit(test_size=0.25, random_state=0).split(X, y, blocks))

# ---------- 4. Train ----------
print("Training...")
model = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.08, random_state=0)
model.fit(X.iloc[train_i], y[train_i],
          sample_weight=compute_sample_weight("balanced", y[train_i]))

# ---------- 5. How good is it? ----------
p_test = model.predict_proba(X.iloc[test_i])[:, 1]
y_test = y[test_i]
auc = roc_auc_score(y_test, p_test)
ap = average_precision_score(y_test, p_test)
top10 = np.argsort(p_test)[::-1][: max(1, len(p_test) // 10)]
caught = y_test[top10].sum() / max(1, y_test.sum())

print("\n=== RESULTS ON AREAS THE MODEL NEVER SAW ===")
print(f"AUC (0.5 = coin flip, 1.0 = perfect): {auc:.3f}")
print(f"Average precision: {ap:.3f}  (random guessing would be {y_test.mean():.3f})")
print(f"The model's top 10% riskiest poles contain {caught*100:.0f}% of the damaged poles")

# ---------- 6. Which factors matter most? ----------
n = min(20000, len(test_i))
rng = np.random.RandomState(0).choice(len(test_i), n, replace=False)
imp = permutation_importance(model, X.iloc[test_i].iloc[rng], y_test[rng],
                             scoring="roc_auc", n_repeats=3, random_state=0)
imp_df = pd.Series(imp.importances_mean, index=X.columns).sort_values(ascending=False)
print("\n=== MOST IMPORTANT FACTORS (bigger = matters more) ===")
print(imp_df.round(4).to_string())

# ---------- 7. Score every pole and assign a risk band ----------
score = model.predict_proba(X)[:, 1]
hi, med = np.quantile(score, 0.95), np.quantile(score, 0.80)
band = np.where(score >= hi, "High", np.where(score >= med, "Medium", "Low"))
out = pd.DataFrame({"pole_id": poles["id"], "risk_score": score.round(4), "risk_band": band})
out.to_csv(os.path.join(HERE, "poles_risk.csv"), index=False)
joblib.dump({"model": model, "features": list(X.columns), "thresholds": (med, hi),
             "auc": auc}, os.path.join(HERE, "risk_model.joblib"))

print("\nRisk bands:", pd.Series(band).value_counts().to_dict())
print(f"Saved poles_risk.csv and risk_model.joblib  ({time.time()-t0:.0f} seconds)")