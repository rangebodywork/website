"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { priceFor, resolveDuration, type Modality, type ModalityId, type Ritual, type TimeSlotId } from "./catalog";
import { useDatabase } from "./db-context";
import { repository } from "./repository";
import { newCardPayment, type SavedCard } from "./payments/policy";
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

/** Enabled modalities in session order, priced from the current catalog. Services the studio disabled drop out. */
export function sessionBlocks(state: BookingState, modalities: Record<ModalityId, Modality>): SessionBlock[] {
  return state.sequence
    // Stored sessions may name modalities this catalog no longer has; skip those.
    .filter((id) => modalities[id] && state.modalities[id]?.enabled && !modalities[id].disabled)
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

/** A ritual is bookable only while every modality in it is offered. */
export function ritualAvailable(ritual: Ritual, modalities: Record<ModalityId, Modality>): boolean {
  return ritual.blocks.every((b) => modalities[b.id] && !modalities[b.id].disabled);
}

function isDisabled(id: ModalityId): boolean {
  return Boolean(repository.getSnapshot().modalities[id]?.disabled);
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
    if (isDisabled(id) && !getSnapshot().modalities[id].enabled) return;
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
    if (isDisabled(id)) return;
    editSession((s) => ({
      ...s,
      appliedRitual: null,
      modalities: { ...s.modalities, [id]: { ...s.modalities[id], ...patch, enabled: true } },
      sequence: s.sequence.includes(id) ? s.sequence : [...s.sequence, id],
    }));
  },
  applyRitual(ritualId: string) {
    const db = repository.getSnapshot();
    const ritual = db.rituals.find((r) => r.id === ritualId);
    if (!ritual || !ritualAvailable(ritual, db.modalities)) return;
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
  /** Indices refer to the visible blocks; disabled services hidden from the session keep their place at the end. */
  moveInSequence(from: number, to: number) {
    editSession((s) => {
      const visible = s.sequence.filter((id) => !isDisabled(id));
      if (to < 0 || to >= visible.length || from === to) return s;
      const [moved] = visible.splice(from, 1);
      visible.splice(to, 0, moved);
      return { ...s, sequence: [...visible, ...s.sequence.filter(isDisabled)] };
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
  /** Card saved on file from /review; no charge happens. Null removes it. */
  setSavedCard(savedCard: SavedCard | null) {
    updateState((s) => ({ ...s, savedCard }));
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
    const { fullName, phone, emergencyContact } = confirmed.intake;
    const profile = { fullName, phone, emergencyContact };
    updateState(() => confirmed);
    // A first booking seeds the profile; afterwards the profile page owns it.
    if (!repository.getProfile().fullName) void repository.saveProfile(profile);
    void repository.addBooking({
      id: reference,
      createdAt: existing?.createdAt ?? confirmedAt,
      status: "upcoming",
      state: confirmed,
      blocks,
      totalPrice: blocks.reduce((sum, b) => sum + b.price, 0),
      profile,
      // Re-confirming keeps the charge history; a different card replaces the old one but not its history.
      payment:
        existing?.payment && existing.payment.card.paymentProfileId === confirmed.savedCard?.paymentProfileId
          ? existing.payment
          : confirmed.savedCard
            ? newCardPayment(confirmed.savedCard, existing?.payment)
            : existing?.payment,
    });
  },
  /** Mirrors a reschedule from My bookings into the session it was booked from, keeping its confirmation. */
  syncRescheduled(bookingId: string, date: string, slot: TimeSlotId) {
    updateState((s) => (s.bookingId === bookingId ? { ...s, intake: { ...s.intake, date, slot } } : s));
  },
  /** A booking cancelled from My bookings no longer confirms the session it came from. */
  syncCancelled(bookingId: string) {
    updateState((s) => (s.bookingId === bookingId ? { ...s, confirmation: null } : s));
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
