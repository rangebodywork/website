"use client";

import { useState } from "react";
import { useDatabase } from "@/lib/db-context";
import { repository } from "@/lib/repository";
import { durationsFor, MODALITY_ORDER, type Modality, type ModalityId } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

export function AdminServices() {
  const { modalities } = useDatabase();
  const [editing, setEditing] = useState<ModalityId | null>(null);

  const toggleStatus = (id: ModalityId) => {
    void repository.setModalityEnabled(id, Boolean(modalities[id].disabled));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-headline-sm text-primary mb-6">Services</h1>

      <div className="grid gap-4">
        {MODALITY_ORDER.map((id) => modalities[id]).map((m) => (
          <div
            key={m.id}
            className={`rounded-xl border border-outline-variant/30 p-5 space-y-4 ${m.disabled ? "bg-surface opacity-60" : "bg-surface-container-lowest"}`}
          >
            <div className="flex justify-between items-center gap-4">
              <div>
                <p className="font-title-md text-on-surface">
                  {m.name} {m.disabled && "(Disabled)"}
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  {durationsFor(m)
                    .map((d) => `${d}m ${formatPrice(m.pricing[d])}`)
                    .join(" · ")}{" "}
                  — default {m.defaultDuration} min
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(editing === m.id ? null : m.id)}
                  aria-expanded={editing === m.id}
                  className="p-2 text-primary hover:bg-surface-container rounded-lg"
                >
                  Edit Pricing
                </button>
                <button
                  type="button"
                  onClick={() => toggleStatus(m.id)}
                  className={`p-2 rounded-lg ${m.disabled ? "text-primary hover:bg-primary/10" : "text-error hover:bg-error/10"}`}
                >
                  {m.disabled ? "Enable" : "Disable"}
                </button>
              </div>
            </div>
            {editing === m.id && <PricingEditor key={m.id} modality={m} onClose={() => setEditing(null)} />}
          </div>
        ))}
      </div>
    </div>
  );
}

interface Row {
  key: number;
  duration: string;
  price: string;
}

function validate(rows: Row[]): string | null {
  if (rows.length === 0) return "Add at least one duration.";
  const durations = rows.map((r) => Number(r.duration));
  if (durations.some((d) => !Number.isInteger(d) || d <= 0)) return "Durations must be whole minutes above zero.";
  if (new Set(durations).size !== durations.length) return "Each duration can only appear once.";
  if (rows.some((r) => r.price === "" || !(Number(r.price) >= 0))) return "Prices must be zero or more.";
  return null;
}

/** Duration → price table for one modality; the default duration is chosen from the rows. */
function PricingEditor({ modality, onClose }: { modality: Modality; onClose: () => void }) {
  const [rows, setRows] = useState<Row[]>(() =>
    durationsFor(modality).map((d, i) => ({ key: i, duration: String(d), price: String(modality.pricing[d]) })),
  );
  const [defaultDuration, setDefaultDuration] = useState(String(modality.defaultDuration));
  const [error, setError] = useState<string | null>(null);
  const nextKey = Math.max(-1, ...rows.map((r) => r.key)) + 1;

  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form
      aria-label={`${modality.name} pricing`}
      className="space-y-3 border-t border-outline-variant/30 pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        const problem = validate(rows);
        if (problem) return setError(problem);
        const pricing = Object.fromEntries(rows.map((r) => [Number(r.duration), Number(r.price)]));
        const chosen = Number(defaultDuration) in pricing ? Number(defaultDuration) : Number(rows[0].duration);
        void repository.setPricing(modality.id, pricing, chosen);
        onClose();
      }}
    >
      <table className="w-full max-w-md text-body-sm">
        <thead>
          <tr className="text-left text-label-sm text-on-surface-variant">
            <th className="pb-1 font-normal">Minutes</th>
            <th className="pb-1 font-normal">Price (USD)</th>
            <th className="pb-1 font-normal">Default</th>
            <th className="pb-1 font-normal">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="pr-2 py-1">
                <input
                  type="number"
                  min={5}
                  step={5}
                  aria-label="Duration in minutes"
                  value={r.duration}
                  onChange={(e) => update(r.key, { duration: e.target.value })}
                  className="w-24 rounded-md border border-outline-variant bg-surface px-2 py-1 text-on-surface"
                />
              </td>
              <td className="pr-2 py-1">
                <input
                  type="number"
                  min={0}
                  aria-label={`Price for ${r.duration || "new"} minutes`}
                  value={r.price}
                  onChange={(e) => update(r.key, { price: e.target.value })}
                  className="w-28 rounded-md border border-outline-variant bg-surface px-2 py-1 text-on-surface"
                />
              </td>
              <td className="pr-2 py-1">
                <input
                  type="radio"
                  name={`default-${modality.id}`}
                  aria-label={`Default to ${r.duration || "new"} minutes`}
                  checked={defaultDuration === r.duration}
                  onChange={() => setDefaultDuration(r.duration)}
                />
              </td>
              <td className="py-1">
                <button
                  type="button"
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                  aria-label={`Remove ${r.duration || "new"} minute option`}
                  className="rounded-lg px-2 py-1 text-error hover:bg-error/10"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && (
        <p role="alert" className="text-label-sm text-error">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, { key: nextKey, duration: "", price: "" }])}
          className="rounded-lg border border-primary/50 px-3 py-1.5 text-primary hover:bg-primary/10"
        >
          Add duration
        </button>
        <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-on-primary hover:bg-primary-container">
          Save pricing
        </button>
        <button type="button" onClick={onClose} className="rounded-lg border border-outline-variant px-3 py-1.5 text-on-surface">
          Cancel
        </button>
      </div>
    </form>
  );
}
