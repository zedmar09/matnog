import type { ComponentType, ReactNode } from "react";

import { WalletCards } from "lucide-react";

export type TreasurySummaryItem = {
  label: string;
  value: ReactNode;
  recordLabel: string;
  icon?: ComponentType<{ size?: number }>;
};

export function TreasurySummaryCards({ items, label }: { items: readonly TreasurySummaryItem[]; label: string }) {
  return (
    <section className="treasury-summary-grid" aria-label={label}>
      {items.map((item) => (
        <div className="treasury-summary-card" key={item.label}>
          <div className="treasury-summary-heading">
            <span className="treasury-summary-icon">
              {item.icon ? <item.icon size={17} /> : <WalletCards size={17} />}
            </span>
            <span>{item.label}</span>
          </div>
          <div className="treasury-summary-line">
            <strong>{item.value}</strong>
            <small>{item.recordLabel}</small>
          </div>
        </div>
      ))}
    </section>
  );
}
