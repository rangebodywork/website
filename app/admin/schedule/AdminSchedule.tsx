"use client";

import { useDatabase } from "@/lib/db-context";
import { repository } from "@/lib/repository";
import { Icon } from "@/components/Icon";

export function AdminSchedule() {
  const { classes, workshops } = useDatabase();

  const deleteClass = (id: string) => {
    void repository.deleteClass(id);
  };

  const deleteWorkshop = (id: string) => {
    void repository.deleteWorkshop(id);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-headline-sm text-primary">Schedule</h1>
      </div>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-title-lg text-primary">Recurring Classes</h2>
          <button className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-label-sm text-on-primary hover:bg-primary-container">
            <Icon name="add" className="text-sm" /> Add Class
          </button>
        </div>
        <div className="grid gap-4">
          {classes.map((c) => (
            <div key={c.id} className="flex justify-between items-center rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4">
              <div>
                <p className="font-title-md text-on-surface">{c.title}</p>
                <p className="text-body-sm text-on-surface-variant">{c.when} • {c.location}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-primary hover:bg-surface-container rounded-lg">Edit</button>
                <button onClick={() => deleteClass(c.id)} className="p-2 text-error hover:bg-error/10 rounded-lg">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-title-lg text-primary">Workshops</h2>
          <button className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-label-sm text-on-primary hover:bg-primary-container">
            <Icon name="add" className="text-sm" /> Add Workshop
          </button>
        </div>
        <div className="grid gap-4">
          {workshops.map((w) => (
            <div key={w.id} className="flex justify-between items-center rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4">
              <div>
                <p className="font-title-md text-on-surface">{w.title}</p>
                <p className="text-body-sm text-on-surface-variant">{w.date} • {w.when}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-primary hover:bg-surface-container rounded-lg">Edit</button>
                <button onClick={() => deleteWorkshop(w.id)} className="p-2 text-error hover:bg-error/10 rounded-lg">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
