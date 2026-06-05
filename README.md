# RiskLens — AI-Powered Risk Assessment Platform

A platform where users input project parameters and receive quantified risk scores with actionable mitigation recommendations. RiskLens uses a trained ML model to predict risk likelihood and impact across operational, financial, and technical domains — displayed through a React dashboard with risk heatmaps and severity scores.

---

## Project Structure

```
RiskLens/
├── RiskLens/
│   ├── backend/
│   │   ├── app.py
│   │   ├── config.py
│   │   ├── config_dev.py
│   │   ├── requirements.txt
│   │   └── app/
│   │       ├── ml/
│   │       │   ├── model.pkl
│   │       │   └── scaler.pkl
│   │       ├── models/
│   │       ├── routes/
│   │       └── services/
│   ├── frontend/
│   │   ├── package.json
│   │   └── src/
│   └── ml_training/
│       ├── generate_dataset.py
│       ├── train.py
│       ├── evaluate.py
│       ├── feature_analysis.py
│       └── requirements_ml.txt
├── Dockerfile
├── .gitignore
└── README.md
```

---

## Overview

RiskLens is an AI-powered risk assessment platform built for software engineering teams. Users input project parameters and the platform returns quantified risk scores along with actionable mitigation recommendations.

The ML model is trained on historical data to predict risk likelihood and impact across three domains:

- **Operational** — team workload, deployment frequency, CI/CD signals
- **Financial** — deadline pressure, sprint velocity, issue backlog
- **Technical** — PR review depth, contributor risk index, repo health

A **Silent Failure Risk Index (SFRI)** score is computed per team and deployment, and displayed on a React dashboard with risk heatmaps and severity breakdowns. Alerts are delivered via Slack webhooks when the SFRI crosses a configurable threshold.

---

## Tech Stack

| Layer | Tools / Technologies |
|---|---|
| Backend | Python, Flask, SQLAlchemy, JWT, OAuth |
| Frontend | React, JavaScript, Vite |
| ML / Data | scikit-learn, Pandas, NumPy, joblib |
| Database | MySQL / SQLite (dev) |
| Integrations | GitHub API, Atlassian Jira API, Slack Webhook |
| DevOps | Docker |

---

## How to Run

### 1. Clone the Repository

```bash
git clone https://github.com/Venu-R/RiskLens.git
cd RiskLens/RiskLens
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Mac/Linux
# OR
.\.venv\Scripts\Activate.ps1    # Windows PowerShell

pip install -r requirements.txt
```

Create a `backend/.env` file:

```
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://127.0.0.1:5000/api/auth/github/callback

JIRA_CLIENT_ID=your_jira_client_id
JIRA_CLIENT_SECRET=your_jira_client_secret
JIRA_REDIRECT_URI=http://127.0.0.1:5000/auth/callback/jira

SECRET_KEY=your_secret_key
JWT_SECRET_KEY=your_jwt_secret
DATABASE_URL=sqlite:///risklens_dev.db
FRONTEND_URL=http://127.0.0.1:5173

# Optional
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
SLACK_ALERT_THRESHOLD=75
```

Start the backend:

```bash
python app.py
```

Backend runs at `http://127.0.0.1:5000`

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Frontend runs at `http://127.0.0.1:5173`

### 4. ML Model Training (Optional)

If you want to retrain the model:

```bash
cd ml_training
pip install -r requirements_ml.txt
python generate_dataset.py
python train.py
python evaluate.py
```

This outputs `model.pkl` and `scaler.pkl` to `backend/app/ml/`.

---

## ML Model

- **Type:** Classification / Risk Scoring (scikit-learn)
- **Input:** Project parameters — team size, PR activity, CI/CD signals, Jira issue metrics, contributor patterns
- **Output:** SFRI score, risk level (Low / Medium / High / Critical), top risk factors, recommended actions
- **Training Data:** Synthetically generated historical project data via `generate_dataset.py`

---

## Dashboard Features

- Team KPI overview
- Developer risk index per contributor
- Repository health metrics
- Jira issue snapshot and deadline pressure
- Slack delivery signal monitoring
- Live alert feed when SFRI exceeds threshold

---

## Author

**Venu R**
rvenu730@gmail.com

---
