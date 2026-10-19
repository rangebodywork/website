import type { Metadata } from "next";
import { Avatar, PORTRAIT } from "@/components/Avatar";
import { BuilderView } from "@/components/builder/BuilderView";
import { Icon } from "@/components/Icon";
import { HeaderIconLink, SiteHeader } from "@/components/SiteHeader";
import { PRACTITIONER, ROUTES } from "@/lib/nav";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Personalized Session Builder",
};

export default function BuilderPage() {
  return (
    <>
      <SiteHeader
        variant="brand"
        largeBrand
        subtitle={`${PRACTITIONER.name} • Somatic Specialist`}
        actions={
          <>
            <Link
              href={ROUTES.schedule}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-outline-variant/40 bg-surface-container px-2.5 py-1 text-primary transition-all duration-200 hover:bg-surface-container-high active:scale-[0.97] md:hidden"
            >
              <span className="font-label-sm text-label-sm font-medium">Group Schedule</span>
              <Icon name="north_east" className="text-xs text-outline" />
            </Link>
            <HeaderIconLink href={ROUTES.schedule} icon="calendar_today" label="View schedule" />
            <Avatar
              src={PORTRAIT}
              alt={PRACTITIONER.name}
              size={36}
              eager
              className="border border-outline-variant/40"
            />
          </>
        }
      />
      <BuilderView />
    </>
  );
}
