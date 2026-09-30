import type { Metadata } from "next";
import { AdminSchedule } from "./AdminSchedule";

export const metadata: Metadata = {
  title: "Admin Schedule",
};

export default function AdminSchedulePage() {
  return <AdminSchedule />;
}
