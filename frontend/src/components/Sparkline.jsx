//small inline sparkline for the recentByYear chart
// src/components/Sparkline.jsx
import React from 'react';

export default function Sparkline({ data = [], width = 140, height = 30, stroke = '#4f46e5' }) {
  if (!data || !data.length) return <svg width={width} height={height} />;

  const values = data.map(d => d.count);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const stepX = width / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / (max - min || 1)) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline fill="none" stroke={stroke} strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
