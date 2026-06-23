import { ReactNode } from "react";

/** Card shell. Hover lift + glow are owned entirely by the CSS `.panel-hover`
 *  rule (we previously also animated y:-3 in motion, so the two fought over
 *  `transform`). Title uses normal-case tracking — `uppercase` is a no-op for
 *  Hebrew and wide tracking breaks connected Hebrew glyphs. */
export function WidgetCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel panel-hover p-5 ${className}`}>
      {title && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wide text-[var(--fg-muted)]">
            {title}
          </h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
