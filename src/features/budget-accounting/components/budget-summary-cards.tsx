import type { ComponentType, ReactNode } from "react";

export function BudgetSummaryCards({
  label,
  items,
}: {
  label: string;
  items: readonly {
    label: string;
    value: ReactNode;
    detail: string;
    icon: ComponentType<{ size?: number }>;
  }[];
}) {
  return (
    <section className="treasury-summary-grid" aria-label={label}>
      {items.map((item) => (
        <div className="treasury-summary-card" key={item.label}>
          <div className="treasury-summary-heading">
            <span className="treasury-summary-icon">
              <item.icon size={17} />
            </span>
            <span>{item.label}</span>
          </div>
          <div className="treasury-summary-line">
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </div>
        </div>
      ))}
    </section>
  );
}
