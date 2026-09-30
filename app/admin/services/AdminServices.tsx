"use client";

import { useDatabase } from "@/lib/db-context";
import { repository } from "@/lib/repository";

export function AdminServices() {
  const { modalities } = useDatabase();

  const toggleStatus = (id: string) => {
    repository.update((db) => {
      const mod = db.modalities[id];
      return {
        ...db,
        modalities: {
          ...db.modalities,
          [id]: { ...mod, disabled: !mod.disabled },
        },
      };
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-headline-sm text-primary mb-6">Services</h1>

      <div className="grid gap-4">
        {Object.entries(modalities).map(([id, m]) => (
          <div key={id} className={`rounded-xl border border-outline-variant/30 p-5 flex justify-between items-center ${m.disabled ? 'bg-surface opacity-60' : 'bg-surface-container-lowest'}`}>
            <div>
              <p className="font-title-md text-on-surface">{m.name} {m.disabled && "(Disabled)"}</p>
              <p className="text-body-sm text-on-surface-variant">Default duration: {m.defaultDuration} min</p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 text-primary hover:bg-surface-container rounded-lg">Edit Pricing</button>
              <button 
                onClick={() => toggleStatus(id)} 
                className={`p-2 rounded-lg ${m.disabled ? 'text-primary hover:bg-primary/10' : 'text-error hover:bg-error/10'}`}
              >
                {m.disabled ? "Enable" : "Disable"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
