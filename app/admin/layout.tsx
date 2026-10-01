import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { AdminNav } from "./AdminNav";
import { PasscodeGate, SignOutButton } from "./PasscodeGate";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <PasscodeGate>
    <div className="flex min-h-dvh flex-col md:flex-row bg-surface">
      <aside className="w-full md:w-64 border-r border-outline-variant/30 bg-surface-container-low p-4 space-y-4">
        <div className="flex items-center gap-2 text-primary pb-4 border-b border-outline-variant/30">
          <Icon name="spa" className="text-2xl" />
          <span className="font-title-md font-bold uppercase tracking-widest">Admin</span>
        </div>
        <AdminNav />
        <div className="flex md:flex-col gap-2 border-t border-outline-variant/30 pt-4">
          <Link
            href="/"
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-container text-on-surface-variant font-label-md"
          >
            <Icon name="arrow_back" className="text-lg" /> Customer site
          </Link>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-4 md:p-8">
        {children}
      </main>
    </div>
    </PasscodeGate>
  );
}
