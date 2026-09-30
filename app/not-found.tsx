import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader variant="brand" />
      <main className="mx-auto max-w-lg space-y-4 px-4 py-space-xl text-center">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary">This path is resting</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          The page you were looking for doesn&apos;t exist. Let&apos;s return you to the sanctuary.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 font-title-md text-title-md text-on-primary hover:bg-primary-container"
        >
          Build a session
        </Link>
      </main>
    </>
  );
}
