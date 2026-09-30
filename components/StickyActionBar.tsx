import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Fixed bottom summary / CTA bar used by each booking step. */
export function StickyActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <aside className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant/20 bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-drawer backdrop-blur-md">
      <div className={cn("mx-auto w-full max-w-lg px-4 py-3.5 md:max-w-3xl", className)}>{children}</div>
    </aside>
  );
}
