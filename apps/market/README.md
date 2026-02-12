# Crop Market Full Stack (FastAPI + React + Celery + Postgres + Prometheus + Grafana)

Quick start (requires Docker & Docker Compose):

1. Copy `.env.example` to `backend/.env` and adjust env vars if needed.
2. Build and run services:
   ```
   docker-compose up --build
   ```
3. Frontend should be available at: http://localhost:3000
   Backend API at: http://localhost:8000
   Prometheus: http://localhost:9090
   Grafana: http://localhost:3001 (admin/admin)

Import sample data:
- Use the `backend/scripts/ingest_csv.py` script with Celery running to ingest `sample_data/daily_prices_sample.csv`.

Notes:
- This repo is a starting point. Update DB models and add authentication for production.
