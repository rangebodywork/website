import type { IconName } from "./icons";

export const ROUTES = {
  builder: "/",
  intake: "/intake",
  review: "/review",
  schedule: "/schedule",
  bookings: "/bookings",
  profile: "/profile",
} as const;

/** Primary navigation (bottom bar on mobile, header links on desktop). */
export const PRIMARY_NAV: Array<{ href: string; label: string; icon: IconName; match: string[] }> = [
  // Intake and review are steps of building a session, so they keep "Practices" active.
  { href: ROUTES.builder, label: "Practices", icon: "self_improvement", match: [ROUTES.builder, ROUTES.intake, ROUTES.review] },
  { href: ROUTES.schedule, label: "Schedule", icon: "event", match: [ROUTES.schedule] },
  { href: ROUTES.bookings, label: "My bookings", icon: "hourglass_empty", match: [ROUTES.bookings] },
  { href: ROUTES.profile, label: "Profile", icon: "person", match: [ROUTES.profile] },
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
