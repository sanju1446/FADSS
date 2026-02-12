import React from 'react';

export default function SummaryCards({ summary }) {
  const s = summary || { current_price: 0, min_price: 0, max_price: 0, trend: 'N/A', demand: 'N/A' };

  const isRising = s.trend === 'Rising' || s.trend === 'rising';
  const trendClass = isRising ? 'trend-up' : 'trend-down';
  const trendIcon = isRising ? '▲' : '▼';

  return (
    <div className="summary-grid">
      <div className="summary-item">
        <div className="summary-label">Current Price</div>
        <div className="summary-value">₹{Math.round(s.current_price).toLocaleString()}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>per quintal</div>
      </div>

      <div className="summary-item">
        <div className="summary-label">Price Range</div>
        <div className="summary-value" style={{ fontSize: 22 }}>₹{Math.round(s.min_price)} - ₹{Math.round(s.max_price)}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Daily fluctuation</div>
      </div>

      <div className="summary-item">
        <div className="summary-label">Price Trend</div>
        <div className="summary-value">{s.trend}</div>
        <div className={trendClass}>
          {trendIcon} {isRising ? 'Uptrend' : 'Downtrend'}
        </div>
      </div>


    </div>
  );
}