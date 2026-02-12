import React from 'react';

import SearchBar from './components/SearchBar';
import SummaryCards from './components/SummaryCards';
import PriceChartCard from './components/PriceChartCard';
import TopMarketsCard from './components/TopMarketsCard';
import axios from 'axios';
import { useState, useEffect } from 'react';

export default function App() {
  const [commodity, setCommodity] = useState('Cotton');
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [statePrices, setStatePrices] = useState([]);

  async function fetchAll(comm) {
    try {
      const s = await axios.get(`http://localhost:8001/api/prices/summary?commodity=${encodeURIComponent(comm)}`);
      setSummary(s.data);
      const h = await axios.get(`http://localhost:8001/api/prices/history?commodity=${encodeURIComponent(comm)}&days=30`);
      setHistory(h.data);
      // state-level mock: backend may not provide; we compute latest average per state if available via /api/ (fallback to sample)
      // For now try endpoint /api/prices/state_summary?commodity=... (backend may not have it) - graceful fallback below
      try {
        const st = await axios.get(`http://localhost:8001/api/prices/state_summary?commodity=${encodeURIComponent(comm)}`);
        setStatePrices(st.data);
      } catch (err) {
        // fallback: use mock based on summary
        setStatePrices([
          { state: 'Gujarat', price: summary ? summary.current_price : 52300 },
          { state: 'Maharashtra', price: summary ? Math.max(0, (summary.current_price - 300)) : 52000 },
          { state: 'Telangana', price: summary ? Math.max(0, (summary.current_price - 500)) : 51800 },
          { state: 'Andhra Pradesh', price: summary ? Math.max(0, (summary.current_price - 600)) : 51700 },
          { state: 'Karnataka', price: summary ? Math.max(0, (summary.current_price - 800)) : 51500 }
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => { fetchAll(commodity); }, [commodity]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">FA</div>
          <h1>FADSS Analytics</h1>
        </div>
        {/* Navigation placeholders could go here */}
        <div style={{ marginTop: 'auto', color: 'var(--muted)', fontSize: 12, padding: '0 10px' }}>
          <p>© 2025 CropMarket</p>
        </div>
      </aside>

      <main className="main-content">
        <div className="header">
          <div>
            <h2>Market Trends</h2>
            <p>Real-time commodity prices and market intelligence</p>
          </div>
          {/* User profile or actions could go here */}
        </div>

        <SearchBar value={commodity} onChange={setCommodity} onGet={() => fetchAll(commodity)} />
        <SummaryCards summary={summary} />

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <PriceChartCard data={history} />
          <TopMarketsCard data={statePrices} />
        </div>
      </main>
    </div>
  );
}