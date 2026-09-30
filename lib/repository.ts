import { MODALITIES, RITUALS, type Modality, type Ritual } from "./catalog";
import { RECURRING_CLASSES, WORKSHOPS, type RecurringClass, type Workshop } from "./schedule-data";
import { BookingState } from "./booking-store";

export interface ConfirmedBooking {
  id: string;
  createdAt: string;
  status: "upcoming" | "completed" | "cancelled";
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

export const DEFAULT_DB: AppDatabase = {
  version: 1,
  modalities: MODALITIES,
  rituals: RITUALS,
  classes: RECURRING_CLASSES,
  workshops: WORKSHOPS,
  bookings: [],
};

const STORAGE_KEY = "soma-studio:db";

let current: AppDatabase | null = null;
const listeners = new Set<() => void>();

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

export const repository = {
  getSnapshot: () => read(),
  getServerSnapshot: () => DEFAULT_DB,
  subscribe: (listener: () => void) => {
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
  update: (updater: (db: AppDatabase) => AppDatabase) => {
    current = updater(read());
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      } catch {}
    }
    listeners.forEach((l) => l());
  },
};
