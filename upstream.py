import os
from collections import defaultdict
import pandas as pd

# Finds matched_upstream.txt in the same folder as this script
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(HERE, "matched_upstream.txt")

chains = {}                       # customer -> equipment ids, nearest first
customers_on = defaultdict(set)   # equipment id -> customers who depend on it
device_info = {}                  # equipment id -> (record type, device kind, label)

with open(PATH) as f:
    for line in f:
        parts = line.rstrip("\r\n").split("\t")
        cust = parts[0]
        chain = []
        for item in parts[1:]:
            rec, obj_id, kind, label = item.split("*", 3)
            chain.append(obj_id)
            customers_on[obj_id].add(cust)
            device_info[obj_id] = (rec, kind, label)
        chains[cust] = chain


def show_chain(cust):
    """Everything between this customer and the substation."""
    print(f"Customer {cust}:")
    for obj_id in chains[cust]:
        rec, kind, label = device_info[obj_id]
        n = len(customers_on[obj_id])
        print(f"  {kind:<24} id={obj_id:<11} -> {n} customers depend on it")


def what_if_fails(obj_id):
    """Who loses power if this device fails?"""
    rec, kind, label = device_info[obj_id]
    affected = customers_on[obj_id]
    print(f"{kind} {label} fails -> {len(affected)} customers lose power")
    return affected


# Every protective device and how many customers it covers
impact = pd.DataFrame(
    [(i, device_info[i][1], device_info[i][2], len(c))
     for i, c in customers_on.items()
     if device_info[i][0] != "eo_power_xfrmr_inst"],
    columns=["device_id", "kind", "label", "customers_affected"],
).sort_values("customers_affected", ascending=False)


if __name__ == "__main__":
    print(f"Loaded {len(chains)} customers and {len(device_info)} pieces of equipment.\n")
    show_chain("551102222")
    print()
    what_if_fails("106806741")
    print()
    print(impact.head(10).to_string(index=False))
    impact.to_csv(os.path.join(HERE, "device_impact.csv"), index=False)
    print("\nSaved device_impact.csv")