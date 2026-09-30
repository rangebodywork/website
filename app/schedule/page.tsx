import type { Metadata } from "next";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { HeaderIconLink, SiteHeader } from "@/components/SiteHeader";
import { ROUTES } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Group Classes & Immersions",
};

export default function SchedulePage() {
  return (
    <>
      <SiteHeader
        variant="brand"
        actions={<HeaderIconLink href={ROUTES.intake} icon="calendar_today" label="Book a private session time" />}
      >
        <div className="px-4 pb-3">
          <div className="mx-auto max-w-4xl sm:px-4">
            <nav
              aria-label="Session type"
              className="flex items-center justify-between rounded-full bg-surface-container p-1"
            >
              <Link
                href={ROUTES.builder}
                className="w-1/2 rounded-full px-3 py-2 text-center font-label-md text-label-md text-on-surface-variant transition-colors duration-200 hover:text-primary"
              >
                Private Custom Sessions
              </Link>
              <span
                aria-current="page"
                className="w-1/2 rounded-full bg-primary px-3 py-2 text-center font-label-md text-label-md text-on-primary shadow-sm"
              >
                Group Classes &amp; Immersions
              </span>
            </nav>
          </div>
        </div>
      </SiteHeader>
      <ScheduleView />
      <BottomNav />
    </>
  );
}
