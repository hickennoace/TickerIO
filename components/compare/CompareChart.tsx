"use client";

import { motion } from "motion/react";

export interface CompareSeries {
  symbol: string;
  color: string;
  closes: number[];
}

/**
 * Normalized performance overlay. Every series is rebased to its first close
 * (0%) so assets at wildly different price levels compare on one axis.
 */
export function CompareChart({ series, height = 320 }: { series: CompareSeries[]; height?: number }) {
  const width = 920;
  const padX = 8;
  const padY = 16;

  const normalized = series
    .filter((s) => s.closes.length > 1)
    .map((s) => {
      const base = s.closes[0];
      const pts = s.closes.map((c) => (base ? (c / base - 1) * 100 : 0));
      return { ...s, pts };
    });

  if (normalized.length === 0) {
    return (
      <div className="grid h-[320px] place-items-center text-sm" style={{ color: "var(--fg-dim)" }}>
        No overlapping data to compare yet.
      </div>
    );
  }

  const maxLen = Math.max(...normalized.map((s) => s.pts.length));
  const allVals = normalized.flatMap((s) => s.pts);
  const min = Math.min(...allVals, 0);
  const max = Math.max(...allVals, 0);
  const range = max - min || 1;

  const x = (i: number) => padX + (i / (maxLen - 1)) * (width - padX * 2);
  const y = (v: number) => padY + (1 - (v - min) / range) * (height - padY * 2);

  const zeroY = y(0);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {/* Zero baseline */}
      <line x1={padX} y1={zeroY} x2={width - padX} y2={zeroY} stroke="var(--border-strong)" strokeDasharray="4 4" />
      <text x={padX} y={zeroY - 4} fontSize={11} fill="var(--fg-dim)">
        0%
      </text>
      <text x={width - padX} y={y(max) + 12} fontSize={11} fill="var(--fg-dim)" textAnchor="end">
        {max.toFixed(0)}%
      </text>
      <text x={width - padX} y={y(min) - 4} fontSize={11} fill="var(--fg-dim)" textAnchor="end">
        {min.toFixed(0)}%
      </text>

      {normalized.map((s) => {
        const d = s.pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
        const last = s.pts[s.pts.length - 1];
        return (
          <g key={s.symbol}>
            <motion.path
              d={d}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
            <circle cx={x(s.pts.length - 1)} cy={y(last)} r={3} fill={s.color} />
          </g>
        );
      })}
    </svg>
  );
}
