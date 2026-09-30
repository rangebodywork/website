import type { Metadata } from "next";
import { AdminBookings } from "./AdminBookings";

export const metadata: Metadata = {
  title: "Admin Bookings",
};

export default function AdminBookingsPage() {
  return <AdminBookings />;
}
