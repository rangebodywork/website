import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { ProfileView } from "./ProfileView";

export const metadata: Metadata = {
  title: "My Profile",
};

export default function ProfilePage() {
  return (
    <>
      <SiteHeader variant="flow" back={{ href: "/", label: "Back" }} title={<h1 className="font-title-lg text-title-lg text-primary">My Profile</h1>} />
      <main className="mx-auto max-w-3xl p-4 md:p-8">
        <ProfileView />
      </main>
    </>
  );
}
