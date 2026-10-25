import os
import glob
import pandas as pd
import geopandas as gpd
from upstream import chains, customers_on, device_info   # reuses your working script

HERE = os.path.dirname(os.path.abspath(__file__))


def load(name):
    hits = glob.glob(os.path.join(HERE, "**", name), recursive=True)
    return gpd.read_file(hits[0])


# ---- 1. Which customer column matches the upstream file? ----
cust = load("Customer_Clip.shp")
up_ids = set(chains)
for col in ["id", "premise_nu"]:
    n = cust[col].astype(str).isin(up_ids).sum()
    print(f"Customer column '{col}' matches upstream: {n} of {len(cust)}")

# ---- 2. Match map devices to upstream equipment by their label ----
label_to_id = {label: oid for oid, (rec, kind, label) in device_info.items()}

layers = {
    "Fuse": "Fuse_Bank_Clip.shp",
    "Recloser": "Recloser_Bank_Clip.shp",
    "Transformer": "Transformer_Clip.shp",
}
parts = {}
for kind, fname in layers.items():
    g = load(fname)
    g["oid"] = g["location_n"].map(label_to_id)
    print(f"{kind}: {g['oid'].notna().sum()} of {len(g)} matched upstream")
    g = g[g["oid"].notna()][["oid", "location_n", "aep_circui", "geometry"]].copy()
    g["layer"] = kind
    parts[kind] = g

# Protective devices = fuses + reclosers (what isolates a damaged section)
prot = pd.concat([parts["Fuse"], parts["Recloser"]])
prot = gpd.GeoDataFrame(prot, geometry="geometry", crs=parts["Fuse"].crs)
prot["customers_affected"] = prot["oid"].map(lambda o: len(customers_on[o]))

# ---- 3. Attach each damage record to the nearest protective device ----
dmg = load("arcos_prod_damage_09_28_Clip.shp")
dmg = dmg[dmg.geometry.notna()]
dmg = dmg.to_crs(32617)    # meters (UTM zone 17N covers this area)
prot = prot.to_crs(32617)

j = gpd.sjoin_nearest(
    dmg[["Circuit", "Asset_Type", "Inform_Wor", "Report_Tim", "geometry"]],
    prot[["layer", "location_n", "aep_circui", "customers_affected", "geometry"]],
    how="left",
    distance_col="dist_m",
)
j = j[~j.index.duplicated(keep="first")]
j["same_circuit"] = j["Circuit"] == j["aep_circui"]

print("\nDamage records linked:", len(j))
print("Nearest device is on the same circuit:", round(j["same_circuit"].mean() * 100, 1), "%")
print("Median distance to nearest device (m):", round(j["dist_m"].median(), 1))
print("\nCustomers affected per damage record:")
print(j["customers_affected"].describe().round(1).to_string())
print("\nDamage types:")
print(j["Inform_Wor"].value_counts().head(8).to_string())

j.drop(columns="geometry").to_csv(os.path.join(HERE, "damage_impact.csv"), index=False)
print("\nSaved damage_impact.csv")