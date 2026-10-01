"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { priceFor, resolveDuration, type Modality, type ModalityId } from "./catalog";
import { useDatabase } from "./db-context";
import { repository } from "./repository";
import {
  DEFAULT_STATE,
  getServerSnapshot,
  getSnapshot,
  subscribe,
  updateState,
  type BookingState,
  type IntakeState,
} from "./booking-store";

export interface SessionBlock {
  id: ModalityId;
  name: string;
  duration: number;
  option?: string;
  price: number;
}

/** Enabled modalities in session order, priced from the current catalog. */
export function sessionBlocks(state: BookingState, modalities: Record<ModalityId, Modality>): SessionBlock[] {
  return state.sequence
    .filter((id) => state.modalities[id]?.enabled)
    .map((id) => {
      const modality = modalities[id];
      const duration = resolveDuration(modality, state.modalities[id].duration);
      return {
        id,
        name: modality.name,
        duration,
        option: modality.options ? state.modalities[id].option : undefined,
        price: priceFor(modality, duration),
      };
    });
}

/** Short human reference; regenerated on the (unlikely) collision with an existing booking. */
function newReference(): string {
  const taken = new Set(repository.listBookings().map((b) => b.id));
  let reference: string;
  do {
    const random =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "")
        : Math.random().toString(36).slice(2);
    reference = `SOMA-${random.slice(0, 6).toUpperCase()}`;
  } while (taken.has(reference));
  return reference;
}

function toggleIn<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Edits to the session itself invalidate any earlier confirmation. */
function editSession(updater: (state: BookingState) => BookingState) {
  updateState((s) => ({ ...updater(s), confirmation: null }));
}

const actions = {
  toggleModality(id: ModalityId) {
    editSession((s) => {
      const enabled = !s.modalities[id].enabled;
      return {
        ...s,
        appliedRitual: null,
        modalities: { ...s.modalities, [id]: { ...s.modalities[id], enabled } },
        sequence: enabled ? [...s.sequence.filter((m) => m !== id), id] : s.sequence.filter((m) => m !== id),
      };
    });
  },
  /** Enables the modality (if needed) and applies duration / option. */
  configureModality(id: ModalityId, patch: { duration?: number; option?: string }) {
    editSession((s) => ({
      ...s,
      appliedRitual: null,
      modalities: { ...s.modalities, [id]: { ...s.modalities[id], ...patch, enabled: true } },
      sequence: s.sequence.includes(id) ? s.sequence : [...s.sequence, id],
    }));
  },
  applyRitual(ritualId: string) {
    const ritual = repository.getSnapshot().rituals.find((r) => r.id === ritualId);
    if (!ritual) return;
    editSession((s) => {
      const modalities = Object.fromEntries(
        Object.entries(s.modalities).map(([id, sel]) => [id, { ...sel, enabled: false }]),
      ) as BookingState["modalities"];
      for (const block of ritual.blocks) {
        modalities[block.id] = {
          enabled: true,
          duration: block.duration,
          option: block.option ?? modalities[block.id].option,
        };
      }
      return { ...s, modalities, sequence: ritual.blocks.map((b) => b.id), appliedRitual: ritual.id };
    });
  },
  moveInSequence(from: number, to: number) {
    editSession((s) => {
      if (to < 0 || to >= s.sequence.length || from === to) return s;
      const sequence = [...s.sequence];
      const [moved] = sequence.splice(from, 1);
      sequence.splice(to, 0, moved);
      return { ...s, sequence };
    });
  },
  updateIntake(patch: Partial<IntakeState>) {
    editSession((s) => ({ ...s, intake: { ...s.intake, ...patch } }));
  },
  toggleIntakeList(key: "focusAreas" | "lifestyle" | "movementGoals", value: string) {
    editSession((s) => ({
      ...s,
      intake: { ...s.intake, [key]: toggleIn(s.intake[key] as string[], value) },
    }));
  },
  setPromoCode(promoCode: string) {
    updateState((s) => ({ ...s, promoCode }));
  },
  setCalendarSync(calendarSync: boolean) {
    updateState((s) => ({ ...s, calendarSync }));
  },
  toggleSavedClass(id: string) {
    updateState((s) => ({ ...s, savedClasses: toggleIn(s.savedClasses, id) }));
  },
  /**
   * Saves the session as a booking. A session already confirmed is a no-op
   * (double submit); one confirmed earlier and then edited updates its own
   * booking while that booking is still upcoming.
   */
  confirm() {
    const s = getSnapshot();
    if (s.confirmation) return;
    const existing = s.bookingId
      ? repository.listBookings().find((b) => b.id === s.bookingId && b.status === "upcoming")
      : undefined;
    const reference = existing?.id ?? newReference();
    const confirmedAt = new Date().toISOString();
    const confirmed: BookingState = { ...s, bookingId: reference, confirmation: { reference, confirmedAt } };
    const blocks = sessionBlocks(confirmed, repository.getSnapshot().modalities);
    updateState(() => confirmed);
    void repository.addBooking({
      id: reference,
      createdAt: existing?.createdAt ?? confirmedAt,
      status: "upcoming",
      state: confirmed,
      blocks,
      totalPrice: blocks.reduce((sum, b) => sum + b.price, 0),
    });
  },
  /** Starts a fresh session, keeping the client's contact details and saved classes. */
  startOver() {
    updateState((s) => ({
      ...DEFAULT_STATE,
      savedClasses: s.savedClasses,
      intake: {
        ...DEFAULT_STATE.intake,
        fullName: s.intake.fullName,
        phone: s.intake.phone,
        emergencyContact: s.intake.emergencyContact,
      },
    }));
  },
};

export type BookingActions = typeof actions;

interface BookingContextValue {
  state: BookingState;
  actions: BookingActions;
  blocks: SessionBlock[];
  totalMinutes: number;
  totalPrice: number;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { modalities } = useDatabase();

  const value = useMemo<BookingContextValue>(() => {
    const blocks = sessionBlocks(state, modalities);
    return {
      state,
      actions,
      blocks,
      totalMinutes: blocks.reduce((sum, b) => sum + b.duration, 0),
      totalPrice: blocks.reduce((sum, b) => sum + b.price, 0),
    };
  }, [state, modalities]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used inside <BookingProvider>");
  return ctx;
}
