import csv
import sys
import os
from app import db
from sqlalchemy import insert

# Ensure we can import app modules
sys.path.append(os.getcwd())

def load_data():
    # Use absolute path relative to this script
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, 'app', 'sample_data', 'daily_prices.csv')
    
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        return

    print("Initializing database...")
    db.init_db()

    print(f"Reading {csv_path}...")
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        
    print(f"Found {len(rows)} records. Inserting into database...")
    
    with db.engine.connect() as conn:
        # Optional: Clear existing data to avoid duplicates if re-running
        # conn.execute(db.daily_prices.delete())
        
        # Prepare data for insertion
        from datetime import datetime
        data_to_insert = []
        for row in rows:
            try:
                # Parse date DD-MM-YYYY -> YYYY-MM-DD
                d_str = row['Arrival_Date']
                dt = datetime.strptime(d_str, '%d-%m-%Y').date()
                
                data_to_insert.append({
                    'date': dt,
                    'commodity': row['Commodity'],
                    'market': row['Market'],
                    'state': row['State'],
                    'price': float(row['Modal_x0020_Price']),
                    'arrival_qty': 0, # Not in CSV
                    'source': 'csv_import'
                })
            except Exception as e:
                print(f"Skipping row due to error: {e}")
                continue
            
        if data_to_insert:
            conn.execute(insert(db.daily_prices), data_to_insert)
            conn.commit()
            print("Success! Data populated.")
        else:
            print("No data to insert.")

if __name__ == "__main__":
    load_data()
