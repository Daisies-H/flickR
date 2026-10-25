"""Alert, escalation, and preparation rules.
All thresholds are CHALLENGE ASSUMPTIONS, not official utility policy."""


def range_text(best, worst):
    """Turn hours into friendly text. Always a range, never one number."""
    def fmt(h):
        return f"{round(h)} hours" if h >= 1.5 else "about an hour"
    lo, hi = round(best), round(worst)
    if lo == hi:
        return f"about {hi} hours"
    return f"roughly {lo} to {hi} hours"


def alert_plan(risk_band, customers_affected, hours_likely, hours_worst,
               critical_nearby=False, medical_need=False):
    """Returns whether to alert, when, how, and when to escalate."""
    reasons = []

    # --- Pre-storm alert eligibility ---
    eligible = False
    if risk_band == "High":
        eligible = True
        reasons.append("risk band is High")
    elif risk_band == "Medium" and (customers_affected >= 100 or hours_worst >= 12):
        eligible = True
        reasons.append("Medium risk with a large group of customers or a long possible outage")
    if medical_need and risk_band != "Low":
        eligible = True
        reasons.append("customer declared a medical need and risk is not Low")
    if critical_nearby and risk_band != "Low":
        eligible = True
        reasons.append("a critical facility is on the same circuit")

    # --- Timing ---
    timing = {"High": "48 hours and 24 hours before the storm",
              "Medium": "24 hours before the storm",
              "Low": "no pre-storm alert (outage alerts still apply)"}[risk_band]
    if not eligible:
        timing = "no pre-storm alert (outage alerts still apply)"

    # --- Channel ---
    channels = ["text message", "app notification"]
    if medical_need or hours_worst >= 12:
        channels.append("phone call")

    # --- Escalation triggers ---
    triggers = ["estimate rises by 2 or more hours",
                "outage still unresolved after the worst-case time"]
    if hours_worst >= 24:
        triggers.append("possible outage over 24 hours: send for priority crew review")
    if medical_need:
        triggers.append("outage over 4 hours: personal follow-up for declared medical need")
    if critical_nearby:
        triggers.append("critical facility on circuit: escalate immediately when an outage is confirmed")

    return {"outage_alerts_eligible": True,   # everyone gets outage-confirmed/restored alerts
            "pre_storm_alert": eligible, "why": reasons or ["no alert rule was triggered"],
            "timing": timing, "channels": channels, "escalate_when": triggers}


def prep_tips(hours_worst, medical_need=False, accessibility_need=False):
    """Preparation advice sized to the possible outage length.
    Needs are only used if the customer DECLARED them."""
    tips = [("SAFETY", "Stay away from downed power lines and anything touching them. "
                       "Call 911 for emergencies and report the line to your utility."),
            ("PREPARE", "Charge phones and power banks. Keep a flashlight handy.")]
    if hours_worst >= 4:
        tips.append(("PREPARE", "Keep the fridge and freezer closed. Fill a few bottles with water."))
    if hours_worst >= 12:
        tips.append(("PREPARE", "Plan where you could stay if it runs long, and have cash and any medicines on hand."))
    if hours_worst >= 24:
        tips.append(("PREPARE", "Pack a small go-bag. A long outage is possible, so check on neighbors who may need help."))
    if medical_need:
        tips.append(("SAFETY", "You told us someone depends on powered medical equipment. "
                               "Test your backup power now and know when to call your care provider. "
                               "If anyone is in danger, call 911."))
    if accessibility_need:
        tips.append(("PREPARE", "You told us you have an accessibility need. Plan for how you would reach help "
                                "or communicate during an outage."))
    return tips