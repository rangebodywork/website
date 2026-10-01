"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";
import type { IconName } from "@/lib/icons";

const LINKS: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/admin", label: "Dashboard", icon: "inventory_2" },
  { href: "/admin/bookings", label: "Bookings", icon: "event" },
  { href: "/admin/schedule", label: "Schedule", icon: "calendar_month" },
  { href: "/admin/services", label: "Services", icon: "tune" },
  { href: "/admin/payments", label: "Payments", icon: "lock" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg font-label-md hover:bg-surface-container",
              active ? "bg-surface-container text-primary" : "text-on-surface-variant",
            )}
          >
            <Icon name={link.icon} className="text-lg" /> {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
