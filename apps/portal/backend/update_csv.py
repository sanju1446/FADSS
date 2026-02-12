import pandas as pd
import os

# Define the path
csv_path = r"c:\Users\Amoolya\OneDrive\Desktop\FADSS(complete_full)\apps\portal\backend\crop_data.csv"

# Load the dataset
try:
    df = pd.read_csv(csv_path)
    print(f"Loaded CSV with {len(df)} rows.")
except Exception as e:
    print(f"Error loading CSV: {e}")
    exit(1)

# Define fertilizer mapping
fertilizer_map = {
    'rice': 'Urea',
    'wheat': 'DAP',
    'maize': 'NPK 14-35-14',
    'cotton': 'Superphosphate'
}

# Add 'fertilizer' column
# We map the 'label' column to the fertilizer
df['fertilizer'] = df['label'].str.lower().map(fertilizer_map)

# Check for any unmapped values
if df['fertilizer'].isnull().any():
    print("Warning: Some crops could not be mapped to a fertilizer!")
    print(df[df['fertilizer'].isnull()]['label'].unique())
    # Fill NaN with 'General NPK' just in case
    df['fertilizer'] = df['fertilizer'].fillna('General NPK')

# Move 'fertilizer' column to be right after 'label' if we want, or just append it.
# It's already appended.

# Save the updated CSV
try:
    df.to_csv(csv_path, index=False)
    print(f"Successfully updated {csv_path} with 'fertilizer' column.")
    print(df.head())
except Exception as e:
    print(f"Error saving CSV: {e}")
