from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, Gauge, Summary, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response
from . import db

app = FastAPI(title="Crop Market API")

# CORS for local frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'http_status'])
DATA_FRESHNESS = Gauge('data_freshness_seconds', 'Seconds since last data update')
PRICE_SUMMARY_TIME = Summary('price_summary_processing_seconds', 'Time spent computing price summary')

@app.on_event('startup')
def startup():
    # ❗ VERY IMPORTANT:
    # DO NOT start Prometheus server on port 8000.
    db.init_db()

@app.get('/api/commodities')
def list_commodities():
    return db.get_commodities()

@app.get('/api/prices/summary')
def price_summary(commodity: str = None):
    return db.get_price_summary(commodity)

@app.get('/api/prices/history')
def price_history(commodity: str, days: int = 30):
    return db.get_price_history(commodity, days)

@app.get('/api/prices/state_summary')
def state_summary(commodity: str):
    return db.get_state_summary(commodity)

@app.get('/metrics')
def metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
