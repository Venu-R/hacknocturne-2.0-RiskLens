FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=7860

WORKDIR /app

COPY . /app

RUN pip install --no-cache-dir -r /app/RiskLens/RiskLens/backend/requirements.txt

EXPOSE 7860

CMD ["gunicorn", "--chdir", "/app/RiskLens/RiskLens/backend", "--bind", "0.0.0.0:7860", "app:app"]
