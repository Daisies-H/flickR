import os
import glob
import geopandas as gpd

HERE = os.path.dirname(os.path.abspath(__file__))
files = sorted(glob.glob(os.path.join(HERE, "**", "*.shp"), recursive=True))

print(f"Found {len(files)} shapefiles in {HERE}")

for path in files:
    df = gpd.read_file(path)
    print("\n==", os.path.basename(path), "| rows:", len(df))
    print(list(df.columns))
    print(df.drop(columns="geometry").head(2).to_string())