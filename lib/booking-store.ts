import {
  MODALITIES,
  MODALITY_ORDER,
  MOVEMENT_GOALS,
  type ConsentId,
  type ModalityId,
  type PressureLevel,
  type TimeSlotId,
} from "./catalog";

export interface ModalitySelection {
  enabled: boolean;
  duration: number;
  option?: string;
}

export interface IntakeState {
  /** Local calendar date, YYYY-MM-DD. Null until the client picks a day. */
  date: string | null;
  slot: TimeSlotId;
  focusAreas: string[];
  pressure: PressureLevel;
  movementGoals: Array<(typeof MOVEMENT_GOALS)[number]["id"]>;
  sensitivities: string;
  lifestyle: string[];
  fullName: string;
  phone: string;
  emergencyContact: string;
  consents: Record<ConsentId, boolean>;
}

export interface Confirmation {
  reference: string;
  confirmedAt: string;
}

export interface BookingState {
  version: 1;
  modalities: Record<ModalityId, ModalitySelection>;
  /** Session order of the enabled modalities. */
  sequence: ModalityId[];
  appliedRitual: string | null;
  intake: IntakeState;
  promoCode: string;
  calendarSync: boolean;
  savedClasses: string[];
  confirmation: Confirmation | null;
  /** Booking this session was saved as; re-confirming after an edit updates it instead of adding another. */
  bookingId: string | null;
}

/** Built from the static catalog so the default state is identical on server and client. */
function defaultModalities(): Record<ModalityId, ModalitySelection> {
  const enabled: ModalityId[] = ["coaching", "training", "massage"];
  return Object.fromEntries(
    MODALITY_ORDER.map((id) => [
      id,
      {
        enabled: enabled.includes(id),
        duration: MODALITIES[id].defaultDuration,
        option: MODALITIES[id].options?.defaultChoice,
      },
    ]),
  ) as Record<ModalityId, ModalitySelection>;
}

// Defaults mirror the selections shown in the Stitch screens; personal details
// and health consents start empty so a real client fills them in.
export const DEFAULT_STATE: BookingState = {
  version: 1,
  modalities: defaultModalities(),
  sequence: ["coaching", "training", "massage"],
  appliedRitual: null,
  intake: {
    date: null,
    slot: "morning",
    focusAreas: ["Upper Back & Neck", "Lumbar Spine", "Shoulder Girdle"],
    pressure: "Firm",
    movementGoals: ["mobility", "posture", "vagal"],
    sensitivities: "",
    lifestyle: ["Morning Breath & Awakening Routine"],
    fullName: "",
    phone: "",
    emergencyContact: "",
    consents: { noAcuteIllness: false, pregnant: false, bodyworkConsent: false },
  },
  promoCode: "",
  calendarSync: true,
  savedClasses: [],
  confirmation: null,
  bookingId: null,
};

export const STORAGE_KEY = "soma-studio:booking";

let current: BookingState | null = null;
const listeners = new Set<() => void>();

export function parseBookingState(raw: string | null): BookingState {
  if (!raw) return DEFAULT_STATE;
  try {
    const data = JSON.parse(raw) as Partial<BookingState>;
    if (data.version !== 1) return DEFAULT_STATE;
    return {
      ...DEFAULT_STATE,
      ...data,
      modalities: { ...DEFAULT_STATE.modalities, ...data.modalities },
      intake: {
        ...DEFAULT_STATE.intake,
        ...data.intake,
        consents: { ...DEFAULT_STATE.intake.consents, ...data.intake?.consents },
      },
      // Sessions confirmed before bookingId existed were migrated under their reference (see repository.ts).
      bookingId: data.bookingId ?? data.confirmation?.reference ?? null,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function read(): BookingState {
  if (current) return current;
  try {
    current = parseBookingState(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    current = DEFAULT_STATE;
  }
  return current;
}

export function getSnapshot(): BookingState {
  return read();
}

export function getServerSnapshot(): BookingState {
  return DEFAULT_STATE;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    current = parseBookingState(event.newValue);
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function updateState(updater: (state: BookingState) => BookingState): void {
  current = updater(read());
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage can be unavailable (private mode, quota); state still lives in memory.
  }
  listeners.forEach((l) => l());
}
