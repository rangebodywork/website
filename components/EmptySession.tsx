import Link from "next/link";
import { ROUTES } from "@/lib/nav";
import { Icon } from "./Icon";

/** Shown on flow steps when no modalities have been selected yet. */
export function EmptySession() {
  return (
    <main className="mx-auto max-w-md px-4 py-space-xl text-center">
      <div className="space-y-4 rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-low p-6">
        <Icon name="spa" className="text-3xl text-primary" />
        <h2 className="font-headline-md text-headline-md text-primary">Your session is still unwritten</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Choose a curated ritual or combine modalities in the session builder, then return here to tailor it.
        </p>
        <Link
          href={ROUTES.builder}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-title-md text-title-md text-on-primary hover:bg-primary-container"
        >
          Build your session
          <Icon name="arrow_forward" className="text-lg" />
        </Link>
      </div>
    </main>
  );
}
