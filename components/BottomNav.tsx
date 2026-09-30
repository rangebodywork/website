"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { PRIMARY_NAV } from "@/lib/nav";
import { Icon } from "./Icon";

/** Mobile tab bar (from the Schedule screen). Hidden on md+ where DesktopNav takes over. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around bg-surface-container-low px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-md md:hidden"
    >
      {PRIMARY_NAV.map((item) => {
        const active = item.match.includes(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center rounded-full px-3 py-1.5 transition-colors duration-200 active:scale-[0.96]",
              active ? "bg-primary-fixed text-on-primary-fixed" : "text-on-surface-variant hover:text-primary",
            )}
          >
            <Icon name={item.icon} filled={active} className="text-[22px]" />
            <span className={cn("mt-0.5 font-label-sm text-label-sm", active && "font-semibold")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
