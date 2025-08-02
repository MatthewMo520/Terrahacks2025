import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from db.check import get_event_stats


class AnomalyReporter:
    def __init__(self, days=1):
        self.days = days
        self.rules = {
            "fallen": {"threshold": 1},
            "missed_pills": {"threshold": 3}
        }

    def generate_report(self):
        report = {
            "summary_window": f"Last {self.days} day(s)",
            "anomalies": [],
            "details": []
        }

        # Check for falls
        fall_stats = get_event_stats("fallen", self.days)
        report["details"].append(fall_stats)
        if fall_stats["count"] >= self.rules["fallen"]["threshold"]:
            report["anomalies"].append({
                "event": "fallen",
                "count": fall_stats["count"],
                "last_occurrence": fall_stats["last_occurrence"],
                "note": f"{fall_stats['count']} fall event(s) detected."
            })

        # Check for missed pills (based on absence of "consumed pill")
        pill_stats = get_event_stats("consumed pill", self.days)
        report["details"].append(pill_stats)
        expected_doses = self.days * 3
        missed_doses = expected_doses - pill_stats["count"]

        if missed_doses >= self.rules["missed_pills"]["threshold"]:
            report["anomalies"].append({
                "event": "missed_pills",
                "count": missed_doses,
                "last_occurrence": pill_stats["last_occurrence"],
                "note": f"{missed_doses} medication dose(s) missed (expected {expected_doses})."
            })

        return report
