import { MODALITIES, RITUALS, type Modality, type ModalityId, type Ritual, type TimeSlotId } from "./catalog";
import { RECURRING_CLASSES, WORKSHOPS, type RecurringClass, type Workshop } from "./schedule-data";
import { BookingState } from "./booking-store";

export type BookingStatus = "upcoming" | "completed" | "cancelled";

export interface ConfirmedBooking {
  id: string;
  createdAt: string;
  status: BookingStatus;
  state: BookingState;
}

export interface AppDatabase {
  version: 1;
  modalities: Record<string, Modality>;
  rituals: Ritual[];
  classes: RecurringClass[];
  workshops: Workshop[];
  bookings: ConfirmedBooking[];
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
}

export const DEFAULT_DB: AppDatabase = {
  version: 1,
  modalities: MODALITIES,
  rituals: RITUALS,
  classes: RECURRING_CLASSES,
  workshops: WORKSHOPS,
  bookings: [],
};

const STORAGE_KEY = "soma-studio:db";

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

function parse(raw: string | null): AppDatabase {
  if (!raw) return DEFAULT_DB;
  try {
    const data = JSON.parse(raw) as Partial<AppDatabase>;
    if (data.version !== 1) return DEFAULT_DB;
    return { ...DEFAULT_DB, ...data };
  } catch {
    return DEFAULT_DB;
  }
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
    return current;
  }

  function write(updater: (db: AppDatabase) => AppDatabase): Promise<void> {
    current = updater(read());
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      } catch {
        // Storage can be unavailable (private mode, quota); data still lives in memory.
      }
    }
    listeners.forEach((l) => l());
    return Promise.resolve();
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
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key !== STORAGE_KEY) return;
        current = parse(event.newValue);
        listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
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
  };
}

export const repository: Repository = createLocalStorageRepository();
