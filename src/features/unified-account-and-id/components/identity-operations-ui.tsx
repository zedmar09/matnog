import type { LucideIcon } from "lucide-react";
import { Heart, ImageIcon, QrCode } from "lucide-react";

import type { IdTemplateElement } from "../types/identity-operations";

export function IdentitySummary({
  items,
}: {
  items: { label: string; value: string | number; detail: string; icon: LucideIcon }[];
}) {
  return (
    <section className="treasury-summary-grid" aria-label="Identity summary">
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

function ElementContent({ element }: { element: IdTemplateElement }) {
  if (element.type === "logo") return <Heart fill="currentColor" className="size-[70%]" />;
  if (element.type === "photo")
    return (
      <div className="grid size-full place-items-center">
        <div className="grid size-[72%] place-items-center rounded-full border-2 border-current/20 bg-white font-bold text-xl">
          {element.content || <ImageIcon />}
        </div>
      </div>
    );
  if (element.type === "qr")
    return (
      <div className="grid size-full place-items-center">
        <QrCode className="size-[86%]" strokeWidth={1.7} />
      </div>
    );
  if (element.type === "barcode")
    return (
      <div className="flex size-full flex-col items-center justify-center gap-1">
        <span
          className="h-[62%] w-[88%]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg,currentColor 0 1px,transparent 1px 3px,currentColor 3px 5px,transparent 5px 7px)",
          }}
        />
        <small style={{ fontSize: Math.max(6, element.fontSize - 3) }}>{element.content}</small>
      </div>
    );
  if (element.type === "signature") return <span className="font-serif italic">{element.content}</span>;
  if (element.type === "shape") return null;
  return <span>{element.content}</span>;
}

export function IdCardCanvas({
  elements,
  side,
  selectedId,
  onSelect,
  onPointerDown,
  className = "",
}: {
  elements: IdTemplateElement[];
  side: "front" | "back";
  selectedId?: string;
  onSelect?: (id: string) => void;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>, element: IdTemplateElement) => void;
  className?: string;
}) {
  const visible = elements.filter((element) => element.side === side && element.visible);
  return (
    <div className={`identity-card-canvas ${className}`} data-side={side}>
      {visible.map((element) => (
        <button
          type="button"
          key={element.id}
          className={`identity-card-element ${selectedId === element.id ? "is-selected" : ""}`}
          aria-label={`${element.label} layer`}
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(element.id);
          }}
          onPointerDown={(event) => onPointerDown?.(event, element)}
          style={{
            left: `${element.x}%`,
            top: `${element.y}%`,
            width: `${element.width}%`,
            height: `${element.height}%`,
            fontSize: `${element.fontSize}px`,
            fontWeight: element.fontWeight,
            color: element.color,
            textAlign: element.align,
            background: element.background,
            borderRadius: `${element.radius}px`,
            justifyContent: element.align === "left" ? "flex-start" : element.align === "right" ? "flex-end" : "center",
            padding: element.type === "text" ? "1px 2px" : 0,
            zIndex: element.type === "shape" ? 0 : 1,
          }}
        >
          <ElementContent element={element} />
        </button>
      ))}
    </div>
  );
}
