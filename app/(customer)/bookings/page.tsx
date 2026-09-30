import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { BookingsList } from "./BookingsList";

export const metadata: Metadata = {
  title: "My Bookings",
};

export default function BookingsPage() {
  return (
    <>
      <SiteHeader variant="flow" back={{ href: "/", label: "Back" }} title={<h1 className="font-title-lg text-title-lg text-primary">My Bookings</h1>} />
      <main className="mx-auto max-w-3xl p-4 md:p-8">
        <BookingsList />
      </main>
    </>
  );
}
