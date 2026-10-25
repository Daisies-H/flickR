from rules import range_text, alert_plan, prep_tips

NOTE = ("This is a planning estimate, not a confirmed restoration time. "
        "Check your utility's outage page for official updates.")


def pre_storm(band, best, worst):
    return (f"A storm is coming. Your area has a {band.lower()} chance of power problems. "
            f"If you lose power, it could take {range_text(best, worst)} to restore. "
            f"We suggest charging devices and checking your supplies now. {NOTE}")


def outage_confirmed(best, worst):
    return (f"We've confirmed a power outage in your area. Based on typical repairs, "
            f"power may be back in {range_text(best, worst)}. "
            f"We'll update you if anything changes. {NOTE}")


def estimate_updated(old_worst, best, worst):
    direction = "longer" if worst > old_worst else "shorter"
    return (f"Update: the estimate is now {direction}. Power may be back in "
            f"{range_text(best, worst)}. This can change with crew availability, "
            f"road access, or what crews find on site. {NOTE}")


def restored():
    return ("Good news: power should be back on. If your lights are still off, "
            "check your breaker and tell us so we can look into it.")


if __name__ == "__main__":
    best, likely, worst = 5, 9, 18
    plan = alert_plan("High", customers_affected=150, hours_likely=likely,
                      hours_worst=worst, medical_need=True)
    print("ALERT PLAN:", plan, "\n")
    print("PRE-STORM:", pre_storm("High", best, worst), "\n")
    print("OUTAGE:   ", outage_confirmed(best, worst), "\n")
    print("UPDATE:   ", estimate_updated(worst, 8, 26), "\n")
    print("RESTORED: ", restored(), "\n")
    for label, tip in prep_tips(worst, medical_need=True):
        print(f"[{label}] {tip}")