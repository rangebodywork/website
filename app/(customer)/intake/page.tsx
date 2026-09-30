import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { IntakeView } from "@/components/intake/IntakeView";
import { SessionRecap } from "@/components/intake/SessionRecap";
import { SiteHeader } from "@/components/SiteHeader";
import { ROUTES } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Intake & Tailoring",
};

export default function IntakePage() {
  return (
    <>
      <SiteHeader
        variant="flow"
        back={{ href: ROUTES.builder, label: "Back to session builder" }}
        title={
          <>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-outline">Solo Sanctuary</span>
            <h1 className="font-title-lg text-title-lg tracking-tight text-primary">Intake &amp; Tailoring</h1>
          </>
        }
        actions={
          <span className="flex h-10 w-10 items-center justify-center text-primary">
            <Icon name="spa" />
          </span>
        }
      >
        <SessionRecap />
      </SiteHeader>
      <IntakeView />
    </>
  );
}
