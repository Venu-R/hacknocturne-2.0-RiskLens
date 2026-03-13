"""
alerter.py
Sends risk alerts to Slack webhook when SFRI exceeds threshold.
"""

import requests
import os

RISK_COLORS = {
    "LOW":      "#27AE60",
    "MODERATE": "#F39C12",
    "HIGH":     "#E67E22",
    "CRITICAL": "#E84747",
}

def send_slack_alert(developer, repo, score, level, top_factors, recommendation):
    """Send a risk alert to the configured Slack webhook."""
    webhook_url = os.environ.get("SLACK_WEBHOOK_URL")
    if not webhook_url:
        return {"sent": False, "reason": "No webhook URL configured"}

    color = RISK_COLORS.get(level, "#888888")
    factors_text = ", ".join(top_factors)

    payload = {
        "attachments": [
            {
                "color": color,
                "title": f"🚨 RiskLens Alert — {level} Risk Detected",
                "fields": [
                    {"title": "Developer", "value": developer, "short": True},
                    {"title": "Repository", "value": repo, "short": True},
                    {"title": "SFRI Score", "value": str(score), "short": True},
                    {"title": "Risk Level", "value": level, "short": True},
                    {"title": "Top Signals", "value": factors_text, "short": False},
                    {"title": "Recommendation", "value": recommendation, "short": False},
                ],
                "footer": "RiskLens — Silent Failure Risk Index",
            }
        ]
    }

    try:
        resp = requests.post(webhook_url, json=payload, timeout=5)
        return {"sent": resp.status_code == 200, "status": resp.status_code}
    except Exception as e:
        return {"sent": False, "reason": str(e)}
