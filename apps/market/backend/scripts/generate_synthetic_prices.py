import csv
import random
import os
from datetime import datetime, timedelta

# Constants
INPUT_FILE = os.path.join(os.path.dirname(__file__), "../app/sample_data/daily_prices.csv")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "../app/sample_data/daily_prices_filled.csv")
DAYS_HISTORY = 30
FLUCTUATION_PERCENT = 0.05

def safe_float(val):
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0

def generate_history():
    print(f"Reading from {INPUT_FILE}...")
    
    if not os.path.exists(INPUT_FILE):
        print(f"Error: Input file directly not found at {INPUT_FILE}")
        return

    rows_to_write = []
    fieldnames = []

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        if "Arrival_Date" not in fieldnames:
            fieldnames.append("Arrival_Date")
        
        # Read all base rows
        base_rows = list(reader)
        print(f"Found {len(base_rows)} commodities. Generating {DAYS_HISTORY} days history for each...")

        end_date = datetime.now().date()
        
        for row in base_rows:
            # Extract base prices
            # Handle possible column name variations based on previous file view
            modal_price = safe_float(row.get("Modal_x0020_Price") or row.get("Modal Price") or 0)
            min_price = safe_float(row.get("Min_x0020_Price") or row.get("Min Price") or 0)
            max_price = safe_float(row.get("Max_x0020_Price") or row.get("Max Price") or 0)

            # Generate history backwards from today
            for day_offset in range(DAYS_HISTORY):
                current_date = end_date - timedelta(days=day_offset)
                
                # Create a variation factor between -5% and +5%
                fluctuation = random.uniform(-FLUCTUATION_PERCENT, FLUCTUATION_PERCENT)
                
                new_row = row.copy()
                new_row["Arrival_Date"] = current_date.strftime("%d-%m-%Y")
                
                # Apply fluctuation, keeping prices non-negative
                new_row["Modal_x0020_Price"] = max(0, int(modal_price * (1 + fluctuation)))
                new_row["Min_x0020_Price"] = max(0, int(min_price * (1 + fluctuation)))
                new_row["Max_x0020_Price"] = max(0, int(max_price * (1 + fluctuation)))
                
                # Ensure we strictly use the keys expected by ingestion if they differ in source
                # The ingestion script looks for Modal_x0020_Price etc, so this is fine.
                
                rows_to_write.append(new_row)

    print(f"Writing {len(rows_to_write)} rows to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows_to_write)
    
    print("Done! Synthetic history generated.")

if __name__ == "__main__":
    generate_history()
