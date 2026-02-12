from .celery_app import celery
from . import db
import csv, os
from io import StringIO

@celery.task
def ingest_csv_text(csv_text, source='upload'):
    # parse CSV text and insert rows into DB
    f = StringIO(csv_text)
    reader = csv.DictReader(f)
    inserted = 0
    with db.engine.connect() as conn:
        for r in reader:
            try:
                date = r.get('date') or r.get('Date')
                commodity = r.get('commodity') or r.get('Commodity') or r.get('product')
                price = r.get('price') or r.get('Price') or r.get('rate')
                market = r.get('market') or r.get('Market')
                state = r.get('state') or r.get('State')
                if not date or not commodity or not price:
                    continue
                ins = db.daily_prices.insert().values(date=date, commodity=commodity, price=price, market=market, state=state, source=source)
                conn.execute(ins)
                inserted += 1
            except Exception as e:
                print('ingest error', e)
    return {'inserted': inserted}
