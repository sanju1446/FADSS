import React from 'react';
import Plot from 'react-plotly.js';

export default function TopMarketsCard({ data }) {
  const d = data || [];
  const states = d.map(x => x.state);
  const prices = d.map(x => x.price);

  return (
    <div className="card">
      <h3 className="card-title">Top Markets</h3>

      <div style={{ margin: '20px 0' }}>
        <Plot
          data={[{
            x: states,
            y: prices,
            type: 'bar',
            marker: { color: '#6a82fb', opacity: 0.8 }
          }]}
          layout={{
            height: 200,
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#95a0b5', size: 10 },
            margin: { l: 30, r: 10, t: 10, b: 30 },
            yaxis: { gridcolor: 'rgba(255,255,255,0.05)' }
          }}
          useResizeHandler
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {d.map((s, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px',
            background: 'var(--glass)',
            borderRadius: '8px',
            border: '1px solid var(--glass-2)'
          }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{s.state}</div>
            <div style={{ fontWeight: 600, color: '#e7eef8' }}>₹{Math.round(s.price)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}