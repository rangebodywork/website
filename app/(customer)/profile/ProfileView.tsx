"use client";

import { useDatabase } from "@/lib/db-context";
import { repository, type Profile } from "@/lib/repository";
import { Card, CardHeader } from "@/components/ui/Card";

const FIELDS: Array<{ key: keyof Profile; label: string; type: string; placeholder: string; autoComplete: string }> = [
  { key: "fullName", label: "Full Name", type: "text", placeholder: "Jane Doe", autoComplete: "name" },
  { key: "phone", label: "Phone Number", type: "tel", placeholder: "(555) 123-4567", autoComplete: "tel" },
  { key: "emergencyContact", label: "Emergency Contact", type: "text", placeholder: "Name & Phone", autoComplete: "off" },
];

/** Edits the saved profile record; it pre-fills future intakes and never touches a confirmed session. */
export function ProfileView() {
  const { profile } = useDatabase();

  return (
    <Card>
      <CardHeader title="Personal Information" />
      <div className="mt-4 space-y-4">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="block text-label-md text-on-surface-variant">{field.label}</label>
            <input
              className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface"
              type={field.type}
              autoComplete={field.autoComplete}
              value={profile[field.key]}
              onChange={(e) => void repository.saveProfile({ ...profile, [field.key]: e.target.value })}
              placeholder={field.placeholder}
            />
          </div>
        ))}
        <p className="text-body-sm text-on-surface-variant">
          Saved automatically on this device. We use these details to pre-fill your next intake.
        </p>
      </div>
    </Card>
  );
}
