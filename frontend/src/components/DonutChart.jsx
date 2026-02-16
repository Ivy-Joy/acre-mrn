//Simple, dependency-free SVG donut used for compliance distribution
// src/components/DonutChart.jsx
import React from 'react';

export default function DonutChart({ buckets = { high:0, medium:0, low:0 }, size=120 }) {
  const total = buckets.high + buckets.medium + buckets.low || 1;
  const segments = [
    { key: 'high', value: buckets.high, color: '#059669' },   // emerald
    { key: 'medium', value: buckets.medium, color: '#D97706' }, // amber
    { key: 'low', value: buckets.low, color: '#DC2626' }     // rose
  ];

  const radius = (size/2) - 8;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-full">
        <g transform={`translate(${size/2}, ${size/2})`}>
          {segments.map((seg, i) => {
            const length = (seg.value / total) * circumference;
            const strokeDasharray = `${length} ${circumference - length}`;
            const strokeDashoffset = -offset;
            offset += length;
            return (
              <circle
                key={seg.key}
                r={radius}
                cx="0"
                cy="0"
                fill="transparent"
                stroke={seg.color}
                strokeWidth={12}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90)"
              />
            );
          })}

          {/* inner white circle */}
          <circle r={radius - 14} fill="#fff" />
        </g>
      </svg>

      <div>
        <div className="text-sm text-slate-500">Compliance mix</div>
        <div className="text-lg font-bold">{Math.round((buckets.high/total)*100)}% high</div>
        <div className="text-xs text-slate-400">{total} publications</div>
      </div>
    </div>
  );
}
