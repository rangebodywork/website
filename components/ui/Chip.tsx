import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "../Icon";

type ChipVariant = "duration" | "tag" | "focus" | "filter";

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  selected: boolean;
  variant: ChipVariant;
  children: ReactNode;
  /** Show a check glyph when selected (focus chips). */
  check?: boolean;
}

const BASE: Record<ChipVariant, string> = {
  duration: "min-h-9 rounded-full px-3.5 py-1.5 font-label-md text-label-md",
  tag: "rounded-md px-2.5 py-1 font-label-sm text-label-sm",
  focus: "rounded-full px-3.5 py-1.5 font-label-md text-label-md",
  filter: "shrink-0 rounded-full px-4 py-1.5 font-label-md text-label-md",
};

const STATE: Record<ChipVariant, { on: string; off: string }> = {
  duration: {
    on: "bg-primary-container text-on-primary shadow-sm",
    off: "border border-outline-variant/50 text-on-surface-variant hover:border-primary",
  },
  tag: {
    on: "bg-secondary text-on-secondary font-medium shadow-sm",
    off: "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
  },
  focus: {
    on: "bg-secondary text-on-secondary shadow-sm",
    off: "border border-outline-variant/40 bg-surface-container-highest/80 text-on-surface-variant hover:border-primary",
  },
  filter: {
    on: "bg-primary text-on-primary shadow-sm",
    off: "border border-surface-variant/60 bg-surface-container text-on-surface-variant hover:text-primary",
  },
};

/** Pill-shaped toggle used for durations, techniques, focus areas and filters. */
export function Chip({ selected, variant, check, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 transition-all active:scale-[0.97]",
        BASE[variant],
        selected ? STATE[variant].on : STATE[variant].off,
        className,
      )}
      {...rest}
    >
      {check && selected && <Icon name="check" className="text-sm" filled />}
      {children}
    </button>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-label-sm text-label-sm font-semibold tracking-wide",
        className ?? "bg-primary-fixed text-on-primary-fixed",
      )}
    >
      {children}
    </span>
  );
}
