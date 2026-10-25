import os
import glob
import json
import numpy as np
import pandas as pd
import geopandas as gpd
from scipy.spatial import cKDTree

from upstream import chains, customers_on, device_info
from restore import HOURS_PER_ITEM, ILM, ACCESS_ADDER

HERE = os.path.dirname(os.path.abspath(__file__))


def load(name):
    hits = glob.glob(os.path.join(HERE, "**", name), recursive=True)
    g = gpd.read_file(hits[0])
    g = g[g.geometry.notna()].reset_index(drop=True)
    return g.to_crs(32617)          # meters, so distances are real


def xy(g):
    return np.column_stack([g.geometry.x.values, g.geometry.y.values])


# ---- risk score per customer location ----
# poles_risk.csv comes from train_risk.py, so run that first
poles = load("Pole_Clip.shp")
risk = (pd.read_csv(os.path.join(HERE, "poles_risk.csv"))
        .drop_duplicates("pole_id").set_index("pole_id")["risk_score"])
poles["score"] = poles["id"].map(risk)
poles["score"] = poles["score"].fillna(poles["score"].median())

cust = load("Customer_Clip.shp")
cust["premise"] = cust["premise_nu"].astype(str)
cust = cust[cust["premise"].isin(chains)].reset_index(drop=True)
C = xy(cust)

# a location's risk = average score of its 10 nearest poles
dist, idx = cKDTree(xy(poles)).query(C, k=10)
cust["score"] = poles["score"].values[idx].mean(axis=1)
cust["pole_dist_m"] = dist[:, -1]
hi, med = cust["score"].quantile(0.95), cust["score"].quantile(0.80)
cust["band"] = np.where(cust["score"] >= hi, "High",
                        np.where(cust["score"] >= med, "Medium", "Low"))

# ---- the factors shown to the customer ----
xfmr = load("Transformer_Clip.shp")
prot = pd.concat([load("Fuse_Bank_Clip.shp"), load("Recloser_Bank_Clip.shp")])
cust["d_xfmr"] = cKDTree(xy(xfmr)).query(C)[0]
cust["d_prot"] = cKDTree(xy(prot)).query(C)[0]
cust["n_cust200"] = cKDTree(C).query_ball_point(C, r=200, return_length=True)

# ---- critical facility flag (yes/no only, never names or places) ----
crit = pd.concat([load("Hospitals_Medic_Pairwis_Clip.shp"),
                  load("Fire_Stations_E_Pairwis_Clip.shp"),
                  load("Ambulance_Servi_Pairwis_Clip.shp")])
cust["d_crit"] = cKDTree(xy(crit)).query(C)[0]

# ---- pick 60 anonymous locations: 20 High, 20 Medium, 20 Low ----
rs = np.random.RandomState(7)
picks = []
for b, n in [("High", 20), ("Medium", 20), ("Low", 20)]:
    pool = cust.index[cust["band"] == b].values
    picks += list(rs.choice(pool, min(n, len(pool)), replace=False))
rs.shuffle(picks)

locations = []
for k, i in enumerate(picks):
    row = cust.loc[i]
    levels, n_line = [], 0
    for oid in chains[row["premise"]]:
        rec, kind, _ = device_info[oid]
        n = len(customers_on[oid])
        if rec == "eo_power_xfrmr_inst":
            name = "Equipment right near you (transformer)"
        elif rec == "eo_circuit":
            name = "Main circuit breaker at the substation"
        else:
            n_line += 1
            name = f"On the line: {kind}, #{n_line} away from you"
        levels.append({"name": name, "customers": int(n)})
    locations.append({
        "label": f"Location {1001 + k}",
        "band": row["band"],
        "confidence": "Medium" if row["pole_dist_m"] <= 300 else "Low",
        "reliable": bool(row["pole_dist_m"] <= 1000),
        "critical_nearby": bool(row["d_crit"] <= 2000),
        "factors": {
            "dist_transformer_m": round(float(row["d_xfmr"])),
            "dist_protective_m": round(float(row["d_prot"])),
            "customers_within_200m": int(row["n_cust200"]),
        },
        "levels": levels,
    })

out = {
    "typical": {
        "dist_transformer_m": round(float(cust["d_xfmr"].median())),
        "dist_protective_m": round(float(cust["d_prot"].median())),
        "customers_within_200m": int(cust["n_cust200"].median()),
    },
    "labor": {
        "hours_per_item": {k.replace("Damaged ", ""): round(v, 3)
                           for k, v in HOURS_PER_ITEM.items()},
        "indirect_labor_multiplier": ILM,
        "hard_access_adder_hours": ACCESS_ADDER,
    },
    "model": {
        "auc": 0.709,
        "top10pct_captures_damaged_pct": 26,
        "note": "tested on map areas the model never saw",
    },
    "locations": locations,
}

path = os.path.join(HERE, "app_data.json")
with open(path, "w") as f:
    json.dump(out, f, indent=1)

# ---- privacy check: make sure nothing sensitive slipped in ----
text = open(path).read().lower()
bad = [w for w in ["premise", "address", "latitude", "longitude", "street", "hospital", "catawba"]
       if w in text]
print(f"Saved {len(locations)} locations to app_data.json ({os.path.getsize(path)//1024} KB)")
print("Privacy check:", "PASSED" if not bad else f"FOUND {bad}, do not share this file")