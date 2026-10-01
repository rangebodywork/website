"use client";

import { useState, type ReactNode } from "react";
import { useDatabase } from "@/lib/db-context";
import { formatDate, formatTimeRange, formatDuration } from "@/lib/format";
import { repository } from "@/lib/repository";
import { SCHEDULE_FILTERS, type RecurringClass, type ScheduleCategory, type Workshop } from "@/lib/schedule-data";
import { Icon } from "@/components/Icon";

type Editing =
  | { kind: "class"; item: RecurringClass; isNew: boolean }
  | { kind: "workshop"; item: Workshop; isNew: boolean }
  | null;

const CATEGORIES = SCHEDULE_FILTERS.filter((f) => f.id !== "all") as Array<{ id: ScheduleCategory; label: string }>;

function newId(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
  return `${slug}-${crypto.randomUUID().slice(0, 8)}`;
}

const EMPTY_CLASS: RecurringClass = {
  id: "",
  categories: [],
  accent: "primary",
  duration: "60 min",
  level: "All Levels",
  location: "",
  title: "",
  description: "",
  when: "",
  whenIcon: "schedule",
  venue: "",
  notice: "",
  inquirySubject: "",
};

const EMPTY_WORKSHOP: Workshop = {
  id: "",
  categories: [],
  title: "",
  kicker: "",
  price: 0,
  date: "",
  startMinutes: 10 * 60,
  durationMinutes: 120,
  when: "",
  venue: "",
  description: "",
};

export function AdminSchedule() {
  const { classes, workshops } = useDatabase();
  const [editing, setEditing] = useState<Editing>(null);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-headline-sm text-primary">Schedule</h1>
      </div>

      {editing?.kind === "class" && (
        <ClassForm
          key={editing.item.id || "new-class"}
          initial={editing.item}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === "workshop" && (
        <WorkshopForm
          key={editing.item.id || "new-workshop"}
          initial={editing.item}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
        />
      )}

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-title-lg text-primary">Recurring Classes</h2>
          <button
            type="button"
            onClick={() => setEditing({ kind: "class", item: EMPTY_CLASS, isNew: true })}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-label-sm text-on-primary hover:bg-primary-container"
          >
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
                <button
                  type="button"
                  onClick={() => setEditing({ kind: "class", item: c, isNew: false })}
                  aria-label={`Edit ${c.title}`}
                  className="p-2 text-primary hover:bg-surface-container rounded-lg"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void repository.deleteClass(c.id)}
                  aria-label={`Delete ${c.title}`}
                  className="p-2 text-error hover:bg-error/10 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {classes.length === 0 && <p className="text-body-md text-on-surface-variant">No recurring classes.</p>}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-title-lg text-primary">Workshops</h2>
          <button
            type="button"
            onClick={() => setEditing({ kind: "workshop", item: EMPTY_WORKSHOP, isNew: true })}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-label-sm text-on-primary hover:bg-primary-container"
          >
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
                <button
                  type="button"
                  onClick={() => setEditing({ kind: "workshop", item: w, isNew: false })}
                  aria-label={`Edit ${w.title}`}
                  className="p-2 text-primary hover:bg-surface-container rounded-lg"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void repository.deleteWorkshop(w.id)}
                  aria-label={`Delete ${w.title}`}
                  className="p-2 text-error hover:bg-error/10 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {workshops.length === 0 && <p className="text-body-md text-on-surface-variant">No workshops.</p>}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Forms --- */

const inputClass = "mt-1 block w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-on-surface";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-label-md text-on-surface-variant">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-label-sm text-on-surface-variant">{hint}</p>}
    </div>
  );
}

function CategoryPicker({ value, onChange }: { value: ScheduleCategory[]; onChange: (v: ScheduleCategory[]) => void }) {
  return (
    <fieldset>
      <legend className="block text-label-md text-on-surface-variant">Categories (schedule filters)</legend>
      <div className="mt-1 flex flex-wrap gap-3">
        {CATEGORIES.map((c) => (
          <label key={c.id} className="flex items-center gap-1.5 text-body-sm text-on-surface">
            <input
              type="checkbox"
              checked={value.includes(c.id)}
              onChange={(e) => onChange(e.target.checked ? [...value, c.id] : value.filter((v) => v !== c.id))}
            />
            {c.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FormShell({
  title,
  onSubmit,
  onClose,
  children,
}: {
  title: string;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <form
      aria-label={title}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4 rounded-xl border border-primary/30 bg-surface-container-low p-5"
    >
      <h2 className="text-title-lg text-primary">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-on-primary hover:bg-primary-container">
          Save
        </button>
        <button type="button" onClick={onClose} className="rounded-lg border border-outline-variant px-4 py-2 text-on-surface">
          Cancel
        </button>
      </div>
    </form>
  );
}

function ClassForm({ initial, isNew, onClose }: { initial: RecurringClass; isNew: boolean; onClose: () => void }) {
  const [item, setItem] = useState(initial);
  const set = <K extends keyof RecurringClass>(key: K, value: RecurringClass[K]) => setItem((c) => ({ ...c, [key]: value }));
  const text = (key: "title" | "when" | "location" | "venue" | "duration" | "level" | "inquirySubject") => ({
    id: `class-${key}`,
    value: item[key],
    onChange: (e: { target: { value: string } }) => set(key, e.target.value),
    className: inputClass,
  });

  return (
    <FormShell
      title={isNew ? "Add class" : `Edit ${initial.title}`}
      onClose={onClose}
      onSubmit={() => {
        const id = isNew ? newId(item.title) : item.id;
        void repository.upsertClass({
          ...item,
          id,
          inquirySubject: item.inquirySubject || `Class Inquiry - ${item.title}`,
        });
        onClose();
      }}
    >
      <Field id="class-title" label="Title">
        <input required {...text("title")} />
      </Field>
      <Field id="class-when" label="When" hint="e.g. Tues & Thurs, 7:30 - 8:30 AM">
        <input required {...text("when")} />
      </Field>
      <Field id="class-location" label="Location (short)">
        <input required {...text("location")} />
      </Field>
      <Field id="class-venue" label="Venue">
        <input required {...text("venue")} />
      </Field>
      <Field id="class-duration" label="Duration label">
        <input required {...text("duration")} />
      </Field>
      <Field id="class-level" label="Level">
        <input required {...text("level")} />
      </Field>
      <Field id="class-accent" label="Accent">
        <select
          id="class-accent"
          value={item.accent}
          onChange={(e) => set("accent", e.target.value as RecurringClass["accent"])}
          className={inputClass}
        >
          <option value="primary">Moss (primary)</option>
          <option value="secondary">Terracotta (secondary)</option>
        </select>
      </Field>
      <Field id="class-inquirySubject" label="Inquiry email subject" hint="Defaults to “Class Inquiry - {title}”">
        <input {...text("inquirySubject")} />
      </Field>
      <div className="md:col-span-2">
        <Field id="class-description" label="Description">
          <textarea
            id="class-description"
            required
            rows={3}
            value={item.description}
            onChange={(e) => set("description", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field id="class-notice" label="Booking notice">
          <textarea
            id="class-notice"
            rows={2}
            value={item.notice}
            onChange={(e) => set("notice", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="md:col-span-2">
        <CategoryPicker value={item.categories} onChange={(v) => set("categories", v)} />
      </div>
    </FormShell>
  );
}

function toTimeInput(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function workshopWhen(w: Workshop): string {
  const day = formatDate(w.date, { weekday: "short", month: "short", day: "numeric" });
  return `${day} • ${formatTimeRange(w.startMinutes, w.durationMinutes)} (${formatDuration(w.durationMinutes, "short")})`;
}

function WorkshopForm({ initial, isNew, onClose }: { initial: Workshop; isNew: boolean; onClose: () => void }) {
  const [item, setItem] = useState(initial);
  // Once the admin types in "When", their text wins; otherwise it follows the date and time.
  const [whenEdited, setWhenEdited] = useState(false);
  const set = <K extends keyof Workshop>(key: K, value: Workshop[K]) => setItem((w) => ({ ...w, [key]: value }));

  function resolveWhen(): string {
    if (whenEdited && item.when.trim()) return item.when.trim();
    const timingChanged =
      item.date !== initial.date ||
      item.startMinutes !== initial.startMinutes ||
      item.durationMinutes !== initial.durationMinutes;
    // Untouched timing keeps a hand-written label (e.g. one naming the room); changed timing would make it stale.
    return timingChanged || !item.when.trim() ? workshopWhen(item) : item.when;
  }

  return (
    <FormShell
      title={isNew ? "Add workshop" : `Edit ${initial.title}`}
      onClose={onClose}
      onSubmit={() => {
        const id = isNew ? newId(item.title) : item.id;
        const priceNote = item.priceNote?.trim() || undefined;
        void repository.upsertWorkshop({ ...item, id, priceNote, when: resolveWhen() });
        onClose();
      }}
    >
      <Field id="workshop-title" label="Title">
        <input id="workshop-title" required value={item.title} onChange={(e) => set("title", e.target.value)} className={inputClass} />
      </Field>
      <Field id="workshop-kicker" label="Kicker" hint="e.g. Saturday Intensive">
        <input id="workshop-kicker" required value={item.kicker} onChange={(e) => set("kicker", e.target.value)} className={inputClass} />
      </Field>
      <Field id="workshop-date" label="Date">
        <input id="workshop-date" type="date" required value={item.date} onChange={(e) => set("date", e.target.value)} className={inputClass} />
      </Field>
      <Field id="workshop-start" label="Start time">
        <input
          id="workshop-start"
          type="time"
          required
          value={toTimeInput(item.startMinutes)}
          onChange={(e) => {
            const [h, m] = e.target.value.split(":").map(Number);
            if (!Number.isNaN(h) && !Number.isNaN(m)) set("startMinutes", h * 60 + m);
          }}
          className={inputClass}
        />
      </Field>
      <Field id="workshop-duration" label="Duration (minutes)">
        <input
          id="workshop-duration"
          type="number"
          min={15}
          step={15}
          required
          value={item.durationMinutes}
          onChange={(e) => set("durationMinutes", Number(e.target.value))}
          className={inputClass}
        />
      </Field>
      <Field id="workshop-price" label="Price (USD)">
        <input
          id="workshop-price"
          type="number"
          min={0}
          required
          value={item.price}
          onChange={(e) => set("price", Number(e.target.value))}
          className={inputClass}
        />
      </Field>
      <Field id="workshop-priceNote" label="Price note (optional)" hint="e.g. materials inc.">
        <input id="workshop-priceNote" value={item.priceNote ?? ""} onChange={(e) => set("priceNote", e.target.value)} className={inputClass} />
      </Field>
      <Field id="workshop-when" label="When (display)" hint="Follows date and time unless you edit it here">
        <input
          id="workshop-when"
          value={item.when}
          onChange={(e) => {
            setWhenEdited(true);
            set("when", e.target.value);
          }}
          className={inputClass}
        />
      </Field>
      <div className="md:col-span-2">
        <Field id="workshop-venue" label="Venue">
          <input id="workshop-venue" required value={item.venue} onChange={(e) => set("venue", e.target.value)} className={inputClass} />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field id="workshop-description" label="Description">
          <textarea
            id="workshop-description"
            required
            rows={3}
            value={item.description}
            onChange={(e) => set("description", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="md:col-span-2">
        <CategoryPicker value={item.categories} onChange={(v) => set("categories", v)} />
      </div>
    </FormShell>
  );
}
