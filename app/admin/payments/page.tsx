import type { Metadata } from "next";
import { AdminPayments } from "./AdminPayments";

export const metadata: Metadata = {
  title: "Admin Payments",
};

export default function AdminPaymentsPage() {
  return <AdminPayments />;
}
