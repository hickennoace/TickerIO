"use client";

import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { useEffect } from "react";
import { WidgetCard } from "./WidgetCard";
import { DemoBadge } from "@/components/ui/DemoBadge";

function label(score: number): string {
  if (score < 25) return "Extreme Fear";
  if (score < 45) return "Fear";
  if (score < 55) return "Neutral";
  if (score < 75) return "Greed";
  return "Extreme Greed";
}

function color(score: number): string {
  if (score < 25) return "#ea3943";
  if (score < 45) return "#f0883e";
  if (score < 55) return "#f0b90b";
  if (score < 75) return "#7ac74f";
  return "#16c784";
}

/** Semicircular FOMO / Fear & Greed meter (CLAUDE.md §5.1), animated needle. */
export function FearGreedGauge({ score }: { score: number }) {
  const progress = useMotionValue(0);
  const angle = useTransform(progress, [0, 100], [-90, 90]);
  const rotate = useTransform(angle, (a) => `rotate(${a}deg)`);

  useEffect(() => {
    const controls = animate(progress, score, { duration: 1.1, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [score, progress]);

  // Static colored arc background (semicircle).
  const r = 80;
  const cx = 100;
  const cy = 100;
  const arc = (from: number, to: number) => {
    const a0 = Math.PI - (from / 100) * Math.PI;
    const a1 = Math.PI - (to / 100) * Math.PI;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy - r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy - r * Math.sin(a1);
    return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}`;
  };

  const bands: [number, number, string][] = [
    [0, 25, "#ea3943"],
    [25, 45, "#f0883e"],
    [45, 55, "#f0b90b"],
    [55, 75, "#7ac74f"],
    [75, 100, "#16c784"],
  ];

  return (
    <WidgetCard title="Fear & Greed" action={<DemoBadge />}>
      <div className="flex flex-col items-center">
        <div className="relative h-[112px] w-[200px]">
          <svg width={200} height={112} viewBox="0 0 200 112">
            {bands.map(([f, t, c]) => (
              <path
                key={f}
                d={arc(f, t)}
                fill="none"
                stroke={c}
                strokeWidth={12}
                strokeLinecap="round"
              />
            ))}
          </svg>
          {/* Needle */}
          <motion.div
            className="absolute bottom-[12px] left-1/2"
            style={{ rotate, transformOrigin: "bottom center" }}
          >
            <div
              className="h-[70px] w-[3px] -translate-x-1/2 rounded-full"
              style={{ background: "var(--fg)" }}
            />
          </motion.div>
          <div
            className="absolute bottom-[6px] left-1/2 h-3 w-3 -translate-x-1/2 rounded-full"
            style={{ background: "var(--fg)" }}
          />
        </div>

        <div className="mt-1 text-center">
          <div className="font-mono-num text-3xl font-bold" style={{ color: color(score) }}>
            {score}
          </div>
          <div className="text-sm font-semibold" style={{ color: color(score) }}>
            {label(score)}
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}
