import os
from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, Date, Numeric, TIMESTAMP, func, select
from datetime import datetime, timedelta

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./crop_market.db')
# check_same_thread is required for SQLite in multithreaded envs (FastAPI)
engine = create_engine(DATABASE_URL, echo=False, future=True, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
metadata = MetaData()

daily_prices = Table(
    'daily_prices', metadata,
    Column('id', Integer, primary_key=True),
    Column('date', Date, nullable=False),
    Column('commodity', String(128), nullable=False),
    Column('market', String(128)),
    Column('state', String(128)),
    Column('price', Numeric(12,2)),
    Column('arrival_qty', Numeric(12,2)),
    Column('source', String(128)),
    Column('created_at', TIMESTAMP, server_default=func.now())
)

def init_db():
    metadata.create_all(engine)

def get_commodities():
    with engine.connect() as conn:
        result = conn.execute(select(daily_prices.c.commodity).distinct())
        return [row[0] for row in result if row[0] is not None]

import difflib

def normalize_commodity(query_name):
    if not query_name:
        return None
        
    # Get all valid commodities
    valid_commodities = get_commodities()
    
    # 1. Exact case-insensitive match
    for c in valid_commodities:
        if c.lower() == query_name.lower():
            return c
            
    # 2. Fuzzy match (60% similarity cutoff)
    matches = difflib.get_close_matches(query_name, valid_commodities, n=1, cutoff=0.6)
    if matches:
        return matches[0]
        
    return query_name

def get_price_summary(commodity=None):
    if commodity:
        commodity = normalize_commodity(commodity)

    with engine.connect() as conn:
        q = select(func.max(daily_prices.c.date))
        if commodity:
            q = q.where(daily_prices.c.commodity == commodity)
        latest_date = conn.execute(q).scalar()
        if latest_date is None:
            # Return Mock Data if DB is empty
            return {
                'current_price': 5200.00, 
                'min_price': 5100.00, 
                'max_price': 5400.00, 
                'trend': 'rising', 
                'demand': 'High'
            }

        # Calculate shift to make the latest data point appear as 'Today'
        today = datetime.utcnow().date()
        date_shift = today - latest_date
        
        # We query based on the ACTUAL dates in DB, but virtually shift the thinking
        # Actually, for summary, we just take the latest available data. 
        # The frontend doesn't display the 'date' of the summary, just the price.
        # So standard query is fine, but we treat 'latest_date' as 'today' for consistency.

        # current price avg on latest_date
        q2 = select(func.avg(daily_prices.c.price)).where(daily_prices.c.date == latest_date)
        if commodity:
            q2 = q2.where(daily_prices.c.commodity == commodity)
        current_price = conn.execute(q2).scalar() or 0

        qmin = select(func.min(daily_prices.c.price))
        qmax = select(func.max(daily_prices.c.price))
        if commodity:
            qmin = qmin.where(daily_prices.c.commodity == commodity)
            qmax = qmax.where(daily_prices.c.commodity == commodity)
        pmin = conn.execute(qmin).scalar() or 0
        pmax = conn.execute(qmax).scalar() or 0

        # trend: compare last 7-day avg to previous 7-day avg
        last_date = latest_date
        last7_start = last_date - timedelta(days=6)
        prev7_start = last_date - timedelta(days=13)
        last7 = conn.execute(select(func.avg(daily_prices.c.price)).where(daily_prices.c.date.between(last7_start, last_date)).where(daily_prices.c.commodity == commodity)).scalar() if commodity else conn.execute(select(func.avg(daily_prices.c.price)).where(daily_prices.c.date.between(last7_start, last_date))).scalar()
        prev7 = conn.execute(select(func.avg(daily_prices.c.price)).where(daily_prices.c.date.between(prev7_start, last7_start - timedelta(days=1))).where(daily_prices.c.commodity == commodity)).scalar() if commodity else conn.execute(select(func.avg(daily_prices.c.price)).where(daily_prices.c.date.between(prev7_start, last7_start - timedelta(days=1)))).scalar()

        trend = 'stable'
        try:
            if last7 and prev7:
                trend = 'rising' if last7 > prev7 else ('falling' if last7 < prev7 else 'stable')
        except Exception:
            trend = 'stable'

        return {
            'current_price': float(current_price),
            'min_price': float(pmin),
            'max_price': float(pmax),
            'trend': trend,
            'demand': 'N/A'
        }

def get_price_history(commodity, days=30):
    commodity = normalize_commodity(commodity)
    with engine.connect() as conn:
        # Find the latest available date for this commodity
        latest_date_q = select(func.max(daily_prices.c.date)).where(daily_prices.c.commodity == commodity)
        latest_date = conn.execute(latest_date_q).scalar()

        if not latest_date:
            # Mock History: Generate 30 days of data
            mock_history = []
            import random
            from datetime import date, timedelta
            today = date.today()
            base = 5200
            for i in range(30):
                d = today - timedelta(days=(29-i))
                price = base + (i * 10) + random.randint(-50, 50)
                mock_history.append({'date': str(d), 'price': float(price)})
            return mock_history

        # Determine the date shift needed to bring latest_date to TODAY
        today = datetime.utcnow().date()
        shift = today - latest_date

        start_date_db = latest_date - timedelta(days=days-1)
        
        stmt = select(daily_prices.c.date, func.avg(daily_prices.c.price).label('price')) \
                    .where(daily_prices.c.commodity == commodity) \
                    .where(daily_prices.c.date >= start_date_db) \
                    .group_by(daily_prices.c.date) \
                    .order_by(daily_prices.c.date)
        rows = conn.execute(stmt).fetchall()
        
        # Apply the shift to returned dates
        results = []
        for r in rows:
            original_date = r[0] # date object
            shifted_date = original_date + shift
            results.append({'date': str(shifted_date), 'price': float(r[1])})
            
        return results

def get_state_summary(commodity):
    commodity = normalize_commodity(commodity)
    with engine.connect() as conn:
        # Get latest date for the commodity to ensure we are showing current prices
        latest_date_q = select(func.max(daily_prices.c.date)).where(daily_prices.c.commodity == commodity)
        latest_date = conn.execute(latest_date_q).scalar()

        if not latest_date:
            return [
                {'state': 'Gujarat', 'price': 5350.50},
                {'state': 'Maharashtra', 'price': 5210.00},
                {'state': 'Punjab', 'price': 5150.75},
                {'state': 'Haryana', 'price': 5400.00},
                {'state': 'Madhya Pradesh', 'price': 5100.25}
            ]

        # Query avg price per state for that date
        stmt = select(daily_prices.c.state, func.avg(daily_prices.c.price).label('price')) \
            .where(daily_prices.c.commodity == commodity) \
            .where(daily_prices.c.date == latest_date) \
            .group_by(daily_prices.c.state) \
            .order_by(func.avg(daily_prices.c.price).desc()) \
            .limit(5)
            
        rows = conn.execute(stmt).fetchall()
        return [{'state': r[0], 'price': float(r[1])} for r in rows]
