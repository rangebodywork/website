import { MODALITIES, RITUALS, type Modality, type ModalityId, type Ritual, type TimeSlotId } from "./catalog";
import { RECURRING_CLASSES, WORKSHOPS, type RecurringClass, type Workshop } from "./schedule-data";
import type { SessionBlock } from "./booking-context";
import { STORAGE_KEY as BOOKING_STORAGE_KEY, parseBookingState, type BookingState } from "./booking-store";

/** The client's own contact record, kept apart from any one session's intake. */
export interface Profile {
  fullName: string;
  phone: string;
  emergencyContact: string;
}

export const EMPTY_PROFILE: Profile = { fullName: "", phone: "", emergencyContact: "" };

export type BookingStatus = "upcoming" | "completed" | "cancelled";

export interface ConfirmedBooking {
  id: string;
  createdAt: string;
  status: BookingStatus;
  state: BookingState;
  /** Priced blocks at confirmation time, so later price edits don't rewrite history. */
  blocks?: SessionBlock[];
  totalPrice?: number;
  /** Contact details copied at confirmation time. */
  profile?: Profile;
}

export interface AppDatabase {
  version: 1;
  modalities: Record<ModalityId, Modality>;
  rituals: Ritual[];
  classes: RecurringClass[];
  workshops: Workshop[];
  bookings: ConfirmedBooking[];
  profile: Profile;
}

/**
 * Data access for the whole app. Components read through `useDatabase()` (a
 * synchronous snapshot + subscribe, the shape `useSyncExternalStore` wants) and
 * write only through the domain methods below. Writes return promises so a
 * real backend can implement this interface with network calls; the
 * localStorage implementation resolves immediately.
 */
export interface Repository {
  getSnapshot(): AppDatabase;
  getServerSnapshot(): AppDatabase;
  subscribe(listener: () => void): () => void;

  listBookings(): ConfirmedBooking[];
  addBooking(booking: ConfirmedBooking): Promise<void>;
  setBookingStatus(id: string, status: BookingStatus): Promise<void>;
  rescheduleBooking(id: string, date: string, slot: TimeSlotId): Promise<void>;

  upsertClass(item: RecurringClass): Promise<void>;
  deleteClass(id: string): Promise<void>;
  upsertWorkshop(item: Workshop): Promise<void>;
  deleteWorkshop(id: string): Promise<void>;

  setModalityEnabled(id: ModalityId, enabled: boolean): Promise<void>;
  setPricing(id: ModalityId, pricing: Record<number, number>, defaultDuration: number): Promise<void>;

  getProfile(): Profile;
  saveProfile(profile: Profile): Promise<void>;
}

export const DEFAULT_DB: AppDatabase = {
  version: 1,
  modalities: MODALITIES,
  rituals: RITUALS,
  classes: RECURRING_CLASSES,
  workshops: WORKSHOPS,
  bookings: [],
  profile: EMPTY_PROFILE,
};

const STORAGE_KEY = "soma-studio:db";
const LEGACY_MIGRATED_KEY = "soma-studio:db:legacy-booking-migrated";

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

/* ------------------------------------------------------------ Persistence --- */

/**
 * Bump when the stored shape changes; `parse` migrates older versions.
 * v1 stored whole modality objects, v2 stores only the admin-editable fields.
 */
const SCHEMA_VERSION = 2;

/** The admin-editable part of a modality; everything else always comes from code. */
type ModalityOverride = Pick<Modality, "disabled" | "pricing" | "defaultDuration">;

interface PersistedDatabase {
  version: typeof SCHEMA_VERSION;
  modalities: Partial<Record<ModalityId, ModalityOverride>>;
  classes: RecurringClass[];
  workshops: Workshop[];
  bookings: ConfirmedBooking[];
  profile: Profile;
}

const BOOKING_STATUSES: BookingStatus[] = ["upcoming", "completed", "cancelled"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasStrings(value: Record<string, unknown>, keys: string[]): boolean {
  return keys.every((k) => typeof value[k] === "string");
}

function parsePricing(value: unknown): Record<number, number> | null {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value)
    .map(([d, p]) => [Number(d), p] as const)
    .filter((e): e is readonly [number, number] => {
      const [d, p] = e;
      return Number.isInteger(d) && d > 0 && typeof p === "number" && Number.isFinite(p) && p >= 0;
    });
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

/** Code catalog first, then whichever stored overrides are well-formed. */
function mergeModalities(stored: unknown): Record<ModalityId, Modality> {
  const overrides = isRecord(stored) ? stored : {};
  return Object.fromEntries(
    Object.values(MODALITIES).map((base) => {
      const o = isRecord(overrides[base.id]) ? (overrides[base.id] as Record<string, unknown>) : {};
      const pricing = parsePricing(o.pricing) ?? base.pricing;
      const defaultDuration =
        typeof o.defaultDuration === "number" && o.defaultDuration in pricing
          ? o.defaultDuration
          : base.defaultDuration in pricing
            ? base.defaultDuration
            : Math.min(...Object.keys(pricing).map(Number));
      return [base.id, { ...base, pricing, defaultDuration, disabled: o.disabled === true }];
    }),
  ) as Record<ModalityId, Modality>;
}

function parseList<T>(value: unknown, fallback: T[], valid: (item: Record<string, unknown>) => boolean): T[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item) => isRecord(item) && valid(item)) as T[];
}

const isClass = (c: Record<string, unknown>) =>
  hasStrings(c, ["id", "title", "description", "when", "location", "venue", "duration", "level"]) &&
  Array.isArray(c.categories);

const isWorkshop = (w: Record<string, unknown>) =>
  hasStrings(w, ["id", "title", "kicker", "date", "when", "venue", "description"]) &&
  typeof w.price === "number" &&
  typeof w.startMinutes === "number" &&
  typeof w.durationMinutes === "number" &&
  Array.isArray(w.categories);

const isBooking = (b: Record<string, unknown>) =>
  hasStrings(b, ["id", "createdAt"]) &&
  BOOKING_STATUSES.includes(b.status as BookingStatus) &&
  isRecord(b.state) &&
  Array.isArray(b.state.sequence) &&
  isRecord(b.state.modalities) &&
  isRecord(b.state.intake);

function parse(raw: string | null): AppDatabase {
  if (!raw) return DEFAULT_DB;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || (data.version !== 1 && data.version !== SCHEMA_VERSION)) return DEFAULT_DB;
    return {
      version: 1,
      modalities: mergeModalities(data.modalities),
      // Rituals are not admin-editable, so code changes always win.
      rituals: RITUALS,
      classes: parseList(data.classes, RECURRING_CLASSES, isClass),
      workshops: parseList(data.workshops, WORKSHOPS, isWorkshop),
      bookings: parseList(data.bookings, [], isBooking),
      profile: isRecord(data.profile) && hasStrings(data.profile, ["fullName", "phone", "emergencyContact"])
        ? (data.profile as unknown as Profile)
        : EMPTY_PROFILE,
    };
  } catch {
    return DEFAULT_DB;
  }
}

function serialize(db: AppDatabase): string {
  const persisted: PersistedDatabase = {
    version: SCHEMA_VERSION,
    modalities: Object.fromEntries(
      Object.values(db.modalities).map((m) => [
        m.id,
        { disabled: m.disabled, pricing: m.pricing, defaultDuration: m.defaultDuration },
      ]),
    ),
    classes: db.classes,
    workshops: db.workshops,
    bookings: db.bookings,
    profile: db.profile,
  };
  return JSON.stringify(persisted);
}

/**
 * Before My bookings existed, a confirmed session lived only in the in-progress
 * booking state. Copy it into the bookings list once, so it isn't lost.
 */
function migrateLegacyBooking(db: AppDatabase): AppDatabase {
  if (window.localStorage.getItem(LEGACY_MIGRATED_KEY)) return db;
  window.localStorage.setItem(LEGACY_MIGRATED_KEY, "1");
  const raw = window.localStorage.getItem(BOOKING_STORAGE_KEY);
  if (!raw) return db;
  const state = parseBookingState(raw);
  const confirmation = state.confirmation;
  if (!confirmation || db.bookings.some((b) => b.id === confirmation.reference)) return db;
  const { fullName, phone, emergencyContact } = state.intake;
  const migrated: AppDatabase = {
    ...db,
    bookings: [
      ...db.bookings,
      {
        id: confirmation.reference,
        createdAt: confirmation.confirmedAt,
        status: "upcoming",
        state: { ...state, bookingId: confirmation.reference },
        profile: { fullName, phone, emergencyContact },
      },
    ],
    profile: db.profile.fullName ? db.profile : { fullName, phone, emergencyContact },
  };
  window.localStorage.setItem(STORAGE_KEY, serialize(migrated));
  return migrated;
}

export function createLocalStorageRepository(): Repository {
  let current: AppDatabase | null = null;
  const listeners = new Set<() => void>();

  function read(): AppDatabase {
    if (current) return current;
    if (typeof window === "undefined") return DEFAULT_DB;
    try {
      current = parse(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      current = DEFAULT_DB;
    }
    try {
      current = migrateLegacyBooking(current);
    } catch {
      // Storage unavailable: nothing to migrate from.
    }
    return current;
  }

  function write(updater: (db: AppDatabase) => AppDatabase): Promise<void> {
    current = updater(read());
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, serialize(current));
      } catch {
        // Storage can be unavailable (private mode, quota); data still lives in memory.
      }
    }
    notify();
    return Promise.resolve();
  }

  function notify() {
    listeners.forEach((l) => l());
  }

  /**
   * One `storage` handler per repository, attached while anyone is subscribed: another tab's write
   * re-parses the snapshot once, then every subscriber is notified.
   */
  function onStorage(event: StorageEvent) {
    if (event.key !== STORAGE_KEY) return;
    current = parse(event.newValue);
    notify();
  }

  function patchBooking(id: string, patch: (b: ConfirmedBooking) => ConfirmedBooking) {
    return write((db) => ({ ...db, bookings: db.bookings.map((b) => (b.id === id ? patch(b) : b)) }));
  }

  function patchModality(id: ModalityId, patch: Partial<Modality>) {
    return write((db) => ({ ...db, modalities: { ...db.modalities, [id]: { ...db.modalities[id], ...patch } } }));
  }

  return {
    getSnapshot: () => read(),
    getServerSnapshot: () => DEFAULT_DB,
    subscribe: (listener) => {
      if (listeners.size === 0) window.addEventListener("storage", onStorage);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", onStorage);
      };
    },

    listBookings: () => read().bookings,
    addBooking: (booking) => write((db) => ({ ...db, bookings: upsertById(db.bookings, booking) })),
    setBookingStatus: (id, status) => patchBooking(id, (b) => ({ ...b, status })),
    rescheduleBooking: (id, date, slot) =>
      patchBooking(id, (b) => ({ ...b, state: { ...b.state, intake: { ...b.state.intake, date, slot } } })),

    upsertClass: (item) => write((db) => ({ ...db, classes: upsertById(db.classes, item) })),
    deleteClass: (id) => write((db) => ({ ...db, classes: db.classes.filter((c) => c.id !== id) })),
    upsertWorkshop: (item) => write((db) => ({ ...db, workshops: upsertById(db.workshops, item) })),
    deleteWorkshop: (id) => write((db) => ({ ...db, workshops: db.workshops.filter((w) => w.id !== id) })),

    setModalityEnabled: (id, enabled) => patchModality(id, { disabled: !enabled }),
    setPricing: (id, pricing, defaultDuration) => patchModality(id, { pricing, defaultDuration }),

    getProfile: () => read().profile,
    saveProfile: (profile) => write((db) => ({ ...db, profile })),
  };
}

export const repository: Repository = createLocalStorageRepository();
