//src/components/ComplianceBadge.jsx
import React from 'react';

export default function ComplianceBadge({ score = 0 }) {
  // Clamp score between 0 and 100
  const s = Math.min(Math.max(score, 0), 100);

  // Define refined color palettes
  const styles = {
    high: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      ring: 'stroke-emerald-500',
      dot: 'bg-emerald-500',
      label: 'Optimal'
    },
    mid: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      ring: 'stroke-amber-500',
      dot: 'bg-amber-500',
      label: 'Review'
    },
    low: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      ring: 'stroke-rose-500',
      dot: 'bg-rose-500',
      label: 'Critical'
    }
  };

  const current = s >= 80 ? styles.high : (s >= 50 ? styles.mid : styles.low);

  // SVG Math for the circular ring
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (s / 100) * circumference;

  return (
    <div className={`inline-flex items-center gap-3 px-3 py-1.5 rounded-full border border-white shadow-sm ${current.bg} ${current.text}`}>
      {/* Mini Progress Ring */}
      <div className="relative flex items-center justify-center w-7 h-7">
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="14"
            cy="14"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="3"
            className="opacity-10"
          />
          <circle
            cx="14"
            cy="14"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`transition-all duration-1000 ease-out ${current.ring}`}
          />
        </svg>
        <span className="absolute text-[8px] font-black uppercase tracking-tighter">
          {s}
        </span>
      </div>

      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-black uppercase tracking-[0.1em] opacity-80">
          {current.label}
        </span>
        <span className="text-[9px] font-medium opacity-60">Compliance</span>
      </div>
    </div>
  );
}