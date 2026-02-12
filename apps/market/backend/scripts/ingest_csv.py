import csv
import sys
import os

# Add parent directory to path so we can import 'app'
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from datetime import datetime
from sqlalchemy import insert
from app.db import engine, daily_prices

if len(sys.argv) < 2:
    print("Usage: python scripts/ingest_csv.py sample_data/daily_prices.csv")
    sys.exit(1)

csv_file = sys.argv[1]

def safe_date(value):
    try:
        return datetime.strptime(value, "%d-%m-%Y").date()
    except:
        # If unreadable like "########", use today's date
        return datetime.utcnow().date()

def safe_number(value):
    try:
        return float(value)
    except:
        return 0.0

with engine.begin() as conn:
    with open(csv_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        batch = []
        batch_size = 5000
        count = 0

        print("Starting ingestion...")
        for row in reader:
            batch.append({
                "date": safe_date(row.get("Arrival_Date", "")),
                "commodity": row.get("Commodity", ""),
                "market": row.get("Market", ""),
                "state": row.get("State", ""),
                "price": safe_number(row.get("Modal Price", row.get("Modal_x0020_Price", ""))),
                "arrival_qty": safe_number(row.get("Min Price", row.get("Min_x0020_Price", ""))),
                "source": "csv"
            })
            
            if len(batch) >= batch_size:
                conn.execute(insert(daily_prices), batch)
                count += len(batch)
                print(f"Inserted {count} rows...", end='\r')
                batch = []

        if batch:
            conn.execute(insert(daily_prices), batch)
            count += len(batch)

print(f"\nCSV Imported Successfully! Total rows: {count}")
