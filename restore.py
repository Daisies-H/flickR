import os
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))

# Hours per item (install + removal), from Install_Labor_HackOHIO.xlsx.
# Entries marked ASSUMPTION have no direct row in the workbook.
HOURS_PER_ITEM = {
    "Damaged Pole":      2.503 + 0.927,                   # medium pole
    "Damaged Wire":      (0.374 + 0.212) + 3 * 0.260,     # ASSUMPTION: crossarm + 3 connectors
    "Damaged Switch":    (0.650 + 0.206) + 3 * 0.260,     # ASSUMPTION: equipment lead + 3 connectors
    "Damaged Equipment": 1.188 + 0.806,                   # 25 kVA transformer
    "Damaged Light":     0.617 + 0.254,                   # bracket
}
DEFAULT_HOURS = 1.5       # used when the damage type is unknown
ILM = 4.5                 # Indirect Labor Multiplier (drive, safety, setup)
ACCESS_ADDER = 0.5        # restricted-access adder (hours), from "Labor only work"


def estimate(damage_type, items=1, crews=1, people_per_crew=2, hard_access=False):
    """Return (best, likely, worst) restoration hours for one damage case."""
    base = HOURS_PER_ITEM.get(damage_type, DEFAULT_HOURS)
    work = items * base
    if hard_access:
        work += ACCESS_ADDER
    work *= ILM                                   # add drive/setup/safety time
    repair = work / (crews * people_per_crew)     # split across the people working
    best = 1 + 0.75 * repair                      # assumes ~1 hour wait for a crew
    likely = 3 + repair                           # ~3 hours
    worst = 6 + 1.5 * repair                      # ~6 hours
    return round(best, 1), round(likely, 1), round(worst, 1)


if __name__ == "__main__":
    # Example: one broken pole, one crew of two, easy access
    print("One pole:", estimate("Damaged Pole"))
    print("One pole, hard access, 2 crews:", estimate("Damaged Pole", crews=2, hard_access=True))
    print()

    df = pd.read_csv(os.path.join(HERE, "damage_impact.csv"))
    est = df["Inform_Wor"].apply(lambda t: estimate(t))
    df["hours_best"] = [e[0] for e in est]
    df["hours_likely"] = [e[1] for e in est]
    df["hours_worst"] = [e[2] for e in est]

    print("Likely restoration hours by damage type:")
    print(df.groupby("Inform_Wor")[["hours_best", "hours_likely", "hours_worst"]]
            .median().round(1).to_string())
    df.to_csv(os.path.join(HERE, "damage_with_times.csv"), index=False)
    print("\nSaved damage_with_times.csv")