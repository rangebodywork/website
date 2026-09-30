import type { IconName } from "./icons";

export const ROUTES = {
  builder: "/",
  intake: "/intake",
  review: "/review",
  schedule: "/schedule",
} as const;

/** Primary navigation (bottom bar on mobile, header links on desktop). */
export const PRIMARY_NAV: Array<{ href: string; label: string; icon: IconName; match: string[] }> = [
  { href: ROUTES.builder, label: "Practices", icon: "self_improvement", match: [ROUTES.builder] },
  { href: ROUTES.schedule, label: "Schedule", icon: "event", match: [ROUTES.schedule] },
  { href: ROUTES.review, label: "Journey", icon: "hourglass_empty", match: [ROUTES.review] },
  { href: ROUTES.intake, label: "Profile", icon: "person", match: [ROUTES.intake] },
];

export const STUDIO = {
  name: "Soma Studio",
  email: "hello@somastudio.com",
  practitionerEmail: "elena@somastudio.com",
  instagram: "https://instagram.com/somastudio",
  instagramHandle: "@somastudio",
  address: "428 Linden Blvd, Suite 201, Hayes Valley",
  room: "Soma Sanctuary Studio • Room 4B",
};
