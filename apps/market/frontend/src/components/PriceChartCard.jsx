import React from 'react';
import Plot from 'react-plotly.js';

export default function PriceChartCard({ data }) {
  const x = (data || []).map(d => d.date);
  const y = (data || []).map(d => d.price);

  const nums = y.filter(v => typeof v === 'number');
  const min = nums.length ? Math.min(...nums) : 0;
  const max = nums.length ? Math.max(...nums) : 0;
  const avg = nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
  const change = nums.length >= 2 ? Math.round(((nums[nums.length - 1] - nums[0]) / nums[0]) * 100 * 100) / 100 : 0;
  const changeColor = change < 0 ? 'var(--danger)' : 'var(--success)';

  return (
    <div className="card chart-container">
      <div className="card-header">
        <h3 className="card-title">30-Day Price History</h3>
        <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <div>Min <strong style={{ color: '#fff' }}>₹{min}</strong></div>
          <div>Max <strong style={{ color: '#fff' }}>₹{max}</strong></div>
          <div>Avg <strong style={{ color: '#fff' }}>₹{avg}</strong></div>
          <div style={{ color: changeColor }}>{change}%</div>
        </div>
      </div>

      <Plot
        data={[{
          x,
          y,
          type: 'scatter',
          mode: 'lines+markers',
          line: { color: '#22c1c3', width: 3 },
          marker: { color: '#0f1724', size: 6, line: { color: '#22c1c3', width: 2 } }
        }]}
        layout={{
          height: 320,
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { color: '#95a0b5' },
          margin: { l: 40, r: 20, t: 10, b: 40 },
          xaxis: { gridcolor: 'rgba(255,255,255,0.05)' },
          yaxis: { title: 'Price (₹/quintal)', gridcolor: 'rgba(255,255,255,0.05)' }
        }}
        useResizeHandler
        style={{ width: '100%' }}
      />
    </div>
  );
}