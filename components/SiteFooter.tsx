import Link from "next/link";
import { PRIMARY_NAV, STUDIO } from "@/lib/nav";
import { Icon } from "./Icon";

export function SiteFooter() {
  return (
    <footer className="border-t border-outline-variant/30 bg-surface-container-low/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-36 pt-8 md:flex-row md:pb-32 md:items-start md:justify-between md:px-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Icon name="spa" className="text-[20px]" />
            <span className="font-title-lg text-title-lg tracking-wide">{STUDIO.name}</span>
          </div>
          <p className="max-w-xs font-body-sm text-body-sm text-on-surface-variant">
            {STUDIO.room}
            <br />
            {STUDIO.address}
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-label-md text-label-md text-on-surface-variant hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap gap-2">
          <a
            href={`mailto:${STUDIO.email}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-surface-variant/60 bg-surface-container-low px-3 py-1.5 font-label-sm text-label-sm text-primary hover:bg-surface-container"
          >
            <Icon name="mail" className="text-[16px]" />
            {STUDIO.email}
          </a>
          <a
            href={STUDIO.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-surface-variant/60 bg-surface-container-low px-3 py-1.5 font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container hover:text-primary"
          >
            <Icon name="tag" className="text-[16px]" />
            {STUDIO.instagramHandle}
          </a>
        </div>
      </div>
    </footer>
  );
}
