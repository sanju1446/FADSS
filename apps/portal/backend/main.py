from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
import pickle
from fastapi.middleware.cors import CORSMiddleware

from tasks import read_latest_broadcast, save_broadcast

app = FastAPI()

# Allow frontend to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the model
with open("crop_model.pkl", "rb") as f:
    model = pickle.load(f)

# The INPUT structure must match CSV features
class CropInput(BaseModel):
    N: float
    P: float
    K: float
    temperature: float
    humidity: float
    ph: float


class BroadcastMessage(BaseModel):
    message: str

@app.post("/predict")
def predict_crop(data: CropInput):
    input_data = np.array([[data.N, data.P, data.K,
                            data.temperature, data.humidity, data.ph]])

    prediction = model.predict(input_data)[0]
    
    # Simple lookup based on the updated CSV data (or hardcoded if CSV read fails)
    # Ideally we load this once, but for now let's use a robust mapping here or read the file.
    # Since I just updated the CSV, I will read the mapping from it to be dynamic.
    
    fertilizer = "General NPK"
    try:
        import pandas as pd
        import os
        # Path to the CSV we just updated
        csv_path = os.path.join(os.path.dirname(__file__), "crop_data.csv")
        df = pd.read_csv(csv_path)
        # Create a lookup dict
        lookup = dict(zip(df['label'].str.lower(), df['fertilizer']))
        fertilizer = lookup.get(prediction.lower(), "General NPK")
    except Exception as e:
        print(f"Error reading fertilizer mapping: {e}")
        # Fallback mapping if file read fails
        fallback_map = {
            'rice': 'Urea', 'wheat': 'DAP', 
            'maize': 'NPK 14-35-14', 'cotton': 'Superphosphate'
        }
        fertilizer = fallback_map.get(prediction.lower(), "General NPK")

    return {"crop": prediction, "fertilizer": fertilizer}


@app.post("/broadcast")
def create_broadcast(payload: BroadcastMessage):
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    task = save_broadcast.delay(payload.message.strip())
    return {"task_id": task.id}


@app.get("/broadcast/latest")
def get_latest_broadcast():
    data = read_latest_broadcast()
    return {
        "message": data.get("message"),
        "timestamp": data.get("timestamp"),
    }
