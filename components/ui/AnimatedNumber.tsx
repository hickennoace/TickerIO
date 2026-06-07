"use client";

import { animate, useMotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Springy count-up / live-tick number. Animates smoothly from the previous
 * value to the next whenever `value` changes — gives prices a "live tape" feel.
 */
export function AnimatedNumber({
  value,
  format,
  className,
  style,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState(() => format(value));
  const prev = useRef(value);

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(format(v)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, mv, format]);

  return (
    <span className={className} style={style}>
      {display}
    </span>
  );
}
