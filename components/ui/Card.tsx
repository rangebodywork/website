import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Elevated alabaster card ("Interactive Treatment Card" in DESIGN.md). */
export function Card({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "rounded-xl border border-surface-variant/60 bg-surface-container-lowest p-5 shadow-ambient",
        className,
      )}
      {...rest}
    />
  );
}

/** Heading row used at the top of review / intake cards. */
export function CardHeader({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-surface-variant/50 pb-2">
      <h2 className="font-headline-md text-headline-md text-primary">{title}</h2>
      {aside}
    </div>
  );
}
