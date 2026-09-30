import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { IconName } from "@/lib/icons";
import { STUDIO } from "@/lib/nav";
import { DesktopNav } from "./DesktopNav";
import { Icon } from "./Icon";

interface BrandMarkProps {
  subtitle?: string;
  large?: boolean;
}

export function BrandMark({ subtitle, large }: BrandMarkProps) {
  return (
    <Link href="/" className="group flex items-center gap-2.5 rounded-full" aria-label={`${STUDIO.name} home`}>
      <Icon name="spa" className={cn("text-primary", large ? "text-2xl" : "text-[22px]")} />
      <span>
        <span
          className={cn(
            "block leading-none tracking-tight text-primary",
            large ? "font-headline-md text-headline-md" : "font-title-lg text-title-lg tracking-wide",
          )}
        >
          {STUDIO.name}
        </span>
        {subtitle && (
          <span className="mt-0.5 block font-label-sm text-label-sm text-on-surface-variant">{subtitle}</span>
        )}
      </span>
    </Link>
  );
}

export function HeaderIconLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-full text-primary transition-colors duration-200 hover:bg-surface-container active:scale-[0.98]"
    >
      <Icon name={icon} className="text-[22px]" />
    </Link>
  );
}

type SiteHeaderProps =
  | {
      variant: "brand";
      subtitle?: string;
      largeBrand?: boolean;
      actions?: ReactNode;
      children?: ReactNode;
    }
  | {
      variant: "flow";
      back: { href: string; label: string };
      title: ReactNode;
      actions?: ReactNode;
      children?: ReactNode;
    };

/** Shared sticky top bar. "brand" for browse pages, "flow" for the booking steps. */
export function SiteHeader(props: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-surface/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
        {props.variant === "brand" ? (
          <>
            <BrandMark subtitle={props.subtitle} large={props.largeBrand} />
            <div className="flex items-center gap-1.5 md:gap-4">
              <DesktopNav />
              {props.actions}
            </div>
          </>
        ) : (
          <>
            <Link
              href={props.back.href}
              aria-label={props.back.label}
              className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-primary transition-all duration-150 hover:bg-surface-container active:scale-[0.96]"
            >
              <Icon name="arrow_back" className="text-[22px]" />
            </Link>
            <div className="flex min-w-0 flex-col items-center text-center">{props.title}</div>
            <div className="-mr-1 flex items-center">{props.actions}</div>
          </>
        )}
      </div>
      {props.children}
    </header>
  );
}
