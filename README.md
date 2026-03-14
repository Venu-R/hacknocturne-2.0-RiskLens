# RiskLens

RiskLens is an AI-assisted engineering risk intelligence platform.
It combines GitHub, Jira and Slack integration signals with an ML risk model to estimate silent failure risk before deployment.

## What RiskLens Does

- Authenticates users with:
  - Email/password
  - GitHub OAuth
  - Jira OAuth (Atlassian)
- Aggregates engineering workflow signals from:
  - GitHub repositories, pull requests, CI runs, contributors
  - Jira issues and deadline pressure
  - Slack webhook delivery (alerting workflow)
- Runs a trained ML model to generate:
  - Team and contributor risk indicators
  - SFRI score and risk level
  - Top risk factors and recommended actions
- Displays dynamic dashboard views for:
  - Team KPIs
  - Developer risk index
  - Repo health
  - Jira snapshot
  - Slack delivery signals
  - Alerts

## Video Demo Link: 

https://www.youtube.com/watch?v=8bPEYczmymo

## Repository Structure

```text
RiskLens/
  backend/
    app.py
    config.py
    config_dev.py
    requirements.txt
    app/
      ml/
      models/
      routes/
      services/
  frontend/
    package.json
    src/
  ml_training/
    train.py
    evaluate.py
    generate_dataset.py
    feature_analysis.py
    requirements_ml.txt
```

## Tech Stack

- Backend: Flask, SQLAlchemy, JWT, OAuth, requests
- Frontend: React, Vite
- ML: scikit-learn, pandas, numpy, joblib
- Data sources: GitHub API, Atlassian Jira API, Slack webhook

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm 9+
- GitHub OAuth app credentials
- Atlassian OAuth app credentials
- Optional: Slack Incoming Webhook URL

## Local Setup

### 1. Clone and enter project

```bash
git clone <your-repo-url>
cd RiskLens
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env` (do not commit secrets):

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://127.0.0.1:5000/api/auth/github/callback

# Jira OAuth (Atlassian)
JIRA_CLIENT_ID=your_jira_client_id
JIRA_CLIENT_SECRET=your_jira_client_secret
JIRA_REDIRECT_URI=http://127.0.0.1:5000/auth/callback/jira
JIRA_OAUTH_SCOPES=read:me

# Flask
SECRET_KEY=replace_with_secure_secret
JWT_SECRET_KEY=replace_with_secure_jwt_secret
DATABASE_URL=sqlite:///risklens_dev.db

# Frontend URL used by OAuth callback redirects
FRONTEND_URL=http://127.0.0.1:5000

# Optional Slack
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
SLACK_ALERT_THRESHOLD=75
```

Run backend:

```bash
python app.py
```

Backend default URL: `http://127.0.0.1:5000`

### 3. Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Frontend default URL: `http://127.0.0.1:5173`

To build production assets:

```bash
npm run build
```

## OAuth Notes

### GitHub

Configure callback URL in GitHub OAuth app:

- `http://127.0.0.1:5000/api/auth/github/callback`

The app requests account selection during OAuth start to allow switching users.

### Jira (Atlassian)

Configure callback URL in Atlassian Developer Console:

- `http://127.0.0.1:5000/auth/callback/jira`

If Jira login shows access denied, verify:

- The Atlassian account has access to a Jira site.
- The user is added to the site with Jira product access.
- The callback URL matches exactly.

## ML Model Workflow

ML scripts live in `ml_training/`.

Install ML dependencies:

```bash
cd ml_training
pip install -r requirements_ml.txt
```

Generate data (if needed), train, and evaluate:

```bash
python generate_dataset.py
python train.py
python evaluate.py
```

Artifacts used by backend inference:

- `backend/app/ml/model.pkl`
- `backend/app/ml/scaler.pkl`

## Key API Endpoints

Auth and OAuth:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/github`
- `GET /api/auth/jira`

Integrations and risk:

- `GET /api/integrations/status`
- `GET /api/github/repos`
- `GET /api/github/commits`
- `GET /api/github/pulls`
- `GET /api/github/cicd`
- `GET /api/team-risk`
- `POST /api/predict`
- `GET /api/jira/my-issues`

## Troubleshooting

### Frontend not built

If backend returns frontend-not-built error:

```bash
cd frontend
npm run build
```

### Jira access denied

Usually indicates Atlassian account/site permission issue, not backend bug.
Ensure user has Jira site access and product entitlement.

### OAuth account not switching

Provider sessions are separate from app session.
If needed, use private window or log out from provider website.

## Security

- Never commit `.env` with real secrets.
- Rotate OAuth and webhook secrets if accidentally exposed.
- Use separate credentials for development and production.
  
## License

Add your preferred license file (`LICENSE`) for open-source or internal distribution policy.


