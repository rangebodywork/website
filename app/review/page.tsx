import type { Metadata } from "next";
import { ReviewView } from "@/components/review/ReviewView";
import { BrandMark, HeaderIconLink, SiteHeader } from "@/components/SiteHeader";
import { ROUTES } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Review Your Customized Session",
};

export default function ReviewPage() {
  return (
    <>
      <SiteHeader
        variant="flow"
        back={{ href: ROUTES.intake, label: "Back to intake" }}
        title={<BrandMark />}
        actions={<HeaderIconLink href={ROUTES.schedule} icon="calendar_today" label="View schedule" />}
      />
      <ReviewView />
    </>
  );
}
