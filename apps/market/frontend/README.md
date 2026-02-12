Crop Market Frontend UI
This frontend is a production-like React app using MUI and Plotly.
Place this folder as your project's frontend folder (crop_market_full/frontend) and run docker-compose up --build from the project root.
It expects the backend API at http://localhost:8000 with endpoints:
- /api/prices/summary?commodity=<name>
- /api/prices/history?commodity=<name>&days=30
Optional: /api/prices/state_summary?commodity=<name> (optional fallback used)
