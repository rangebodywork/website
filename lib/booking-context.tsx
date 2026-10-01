"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { priceFor, type ModalityId } from "./catalog";
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
  confirm() {
    const reference = `SOMA-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const confirmedAt = new Date().toISOString();
    updateState((s) => {
      const newState = { ...s, confirmation: { reference, confirmedAt } };
      // Save into global repository
      void repository.addBooking({ id: reference, createdAt: confirmedAt, status: "upcoming", state: newState });
      return newState;
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

  const value = useMemo<BookingContextValue>(() => {
    const blocks = state.sequence
      .filter((id) => state.modalities[id]?.enabled)
      .map((id) => {
        const MODALITIES = repository.getSnapshot().modalities;
        const sel = state.modalities[id];
        return {
          id,
          name: MODALITIES[id].name,
          duration: sel.duration,
          option: MODALITIES[id].options ? sel.option : undefined,
          price: priceFor(id, sel.duration),
        };
      });
    return {
      state,
      actions,
      blocks,
      totalMinutes: blocks.reduce((sum, b) => sum + b.duration, 0),
      totalPrice: blocks.reduce((sum, b) => sum + b.price, 0),
    };
  }, [state]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used inside <BookingProvider>");
  return ctx;
}
