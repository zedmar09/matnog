import Link from "next/link";

import {
  Activity,
  BadgeCheck,
  ClipboardCheck,
  Gavel,
  LayoutDashboard,
  type LucideIcon,
  ReceiptText,
} from "lucide-react";

import { cn } from "@/shared/lib/utils";

import { displayProjectReference } from "../services/project-presentation";

export type ProjectSection = "overview" | "procurement" | "execution" | "inspections" | "billings" | "completion";

export function ProjectRecordNav({ id, active }: { id: string; active: ProjectSection }) {
  const reference = displayProjectReference(id);
  const items: { key: ProjectSection; label: string; href: string; icon: LucideIcon }[] = [
    { key: "overview", label: "Overview", href: `/ops/projects/${reference}`, icon: LayoutDashboard },
    { key: "procurement", label: "Procurement", href: `/ops/projects/${reference}/procurement`, icon: Gavel },
    { key: "execution", label: "Execution", href: `/ops/projects/${reference}/execution`, icon: Activity },
    {
      key: "inspections",
      label: "Inspections",
      href: `/ops/projects/${reference}/inspections`,
      icon: ClipboardCheck,
    },
    { key: "billings", label: "Billings", href: `/ops/projects/${reference}/billings`, icon: ReceiptText },
    { key: "completion", label: "Completion", href: `/ops/projects/${reference}/completion`, icon: BadgeCheck },
  ];
  return (
    <nav
      className="mb-6 grid gap-2 rounded-2xl border bg-card p-2 shadow-sm sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
      aria-label="Project record sections"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const selected = active === item.key;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              selected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-primary/8 hover:text-primary",
            )}
          >
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-lg",
                selected ? "bg-primary-foreground/14" : "bg-primary/10 text-primary",
              )}
            >
              <Icon size={16} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
