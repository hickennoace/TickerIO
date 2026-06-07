import { ReactNode } from "react";

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
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
            {title}
          </h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
