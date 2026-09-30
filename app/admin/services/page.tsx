import type { Metadata } from "next";
import { AdminServices } from "./AdminServices";

export const metadata: Metadata = {
  title: "Admin Services",
};

export default function AdminServicesPage() {
  return <AdminServices />;
}
