import type { IconName } from "./icons";

export type ModalityId = "massage" | "yoga" | "coaching" | "breathwork" | "training";

export interface Modality {
  disabled?: boolean;
  id: ModalityId;
  name: string;
  tagline: string;
  icon: IconName;
  /** Tailwind classes for the round icon badge. */
  badgeClass: string;
  /** Price in USD per available duration (minutes). */
  pricing: Record<number, number>;
  defaultDuration: number;
  /** Optional technique / style picker. */
  options?: { label: string; choices: string[]; defaultChoice: string };
  /** Short focus label shown in the sequence timeline when no option applies. */
  sequenceNote: string;
  /** Title + description used on the review itinerary. */
  itineraryTitle: (option?: string) => string;
  itineraryDescription: string;
  guide?: ModalityGuide;
}

export interface ModalityGuide {
  title: string;
  expect: string;
  idealFor: string;
  wear: string;
  /** What "Select" in the guide applies. */
  select: { label: string; duration: number; option?: string };
}

export const MODALITIES: Record<ModalityId, Modality> = {
  massage: {
    id: "massage",
    name: "Massage & Bodywork",
    tagline: "Myofascial decompression & nervous soothing",
    icon: "self_improvement",
    badgeClass: "bg-primary-fixed text-on-primary-fixed",
    pricing: { 30: 60, 60: 110, 75: 135, 90: 160 },
    defaultDuration: 60,
    options: {
      label: "Focus Technique",
      choices: ["Deep Tissue", "Swedish Relaxation", "Myofascial Release", "Thai Yoga Massage"],
      defaultChoice: "Deep Tissue",
    },
    sequenceNote: "Bodywork",
    itineraryTitle: (option) => `Restorative Bodywork & ${option ?? "Deep Tissue"}`,
    itineraryDescription: "Myofascial release targeting deep muscular fascia with warm herbal compresses.",
    guide: {
      title: "Traditional Thai Yoga Massage",
      expect:
        "Fully clothed on a heated organic cotton floor mat. Rhythmic palm/thumb acupressure, gentle traction, and assisted somatic stretching along energy meridians.",
      idealFor: "Spinal & hip decompression, lymphatic stimulation, and nervous renewal without oils.",
      wear: "Loose, flexible clothing (linen or yoga pants). Clean warm socks or bare feet.",
      select: { label: "Select Thai Massage (60m)", duration: 60, option: "Thai Yoga Massage" },
    },
  },
  yoga: {
    id: "yoga",
    name: "Private Yoga Instruction",
    tagline: "Somatic alignment, breath, & joint mobility",
    icon: "accessibility_new",
    badgeClass: "bg-tertiary-fixed text-on-tertiary-fixed",
    pricing: { 30: 55, 45: 75, 60: 95, 75: 115 },
    defaultDuration: 45,
    options: {
      label: "Instruction Style",
      choices: ["Restorative Yin", "Vinyasa Flow", "Gentle Alignment"],
      defaultChoice: "Restorative Yin",
    },
    sequenceNote: "Yoga",
    itineraryTitle: (option) => `Private Yoga · ${option ?? "Restorative Yin"}`,
    itineraryDescription: "Somatic alignment and breath-led sequencing to open the joints and settle the nervous system.",
    guide: {
      title: "Private Yoga Instruction",
      expect:
        "One-on-one sequencing shaped around your breath, joint history, and energy on the day, supported by linen bolsters and blocks.",
      idealFor: "Joint mobility, postural awareness, and building a home practice you trust.",
      wear: "Breathable, stretchy clothing. Mats and all props are provided.",
      select: { label: "Select Private Yoga (45m)", duration: 45, option: "Restorative Yin" },
    },
  },
  coaching: {
    id: "coaching",
    name: "Health & Habit Coaching",
    tagline: "Circadian rhythm, nutrition, and daily rituals",
    icon: "psychology",
    badgeClass: "bg-secondary-fixed text-on-secondary-container",
    pricing: { 15: 35, 30: 60, 45: 85, 60: 110 },
    defaultDuration: 15,
    sequenceNote: "Goal Framing",
    itineraryTitle: () => "Habit Coaching & Goal Setting",
    itineraryDescription: "Clarifying physical intentions, sleep rhythm, and nervous tension signals.",
    guide: {
      title: "Health & Habit Coaching",
      expect:
        "A seated conversation over herbal tea exploring sleep, nourishment, and daily rhythm, closing with one or two gentle anchors to take home.",
      idealFor: "Stress patterns, restless sleep, and building sustainable daily rituals.",
      wear: "Whatever feels comfortable — this portion is fully seated.",
      select: { label: "Select Coaching (15m)", duration: 15 },
    },
  },
  breathwork: {
    id: "breathwork",
    name: "Meditation & Breathwork",
    tagline: "Pranayama, nervous balancing, and sound bath",
    icon: "air",
    badgeClass: "bg-surface-container-high text-outline",
    pricing: { 30: 40, 45: 60, 60: 80 },
    defaultDuration: 30,
    sequenceNote: "Pranayama",
    itineraryTitle: () => "Meditation & Breathwork",
    itineraryDescription: "Guided pranayama and a closing sound bath to down-regulate and integrate.",
  },
  training: {
    id: "training",
    name: "Personal & Resistance Training",
    tagline: "Intelligent loading, postural stabilization",
    icon: "fitness_center",
    badgeClass: "bg-primary-fixed text-on-primary-fixed",
    pricing: { 30: 50, 45: 70, 60: 90 },
    defaultDuration: 60,
    sequenceNote: "Mobility & Core",
    itineraryTitle: () => "Functional Resistance Training",
    itineraryDescription: "Gentle progressive loading focusing on pelvic alignment and rotator stability.",
  },
};

/** Display order of the modality cards in the builder. */
export const MODALITY_ORDER: ModalityId[] = ["massage", "yoga", "coaching", "breathwork", "training"];

export function durationsFor(id: ModalityId): number[] {
  return Object.keys(MODALITIES[id].pricing)
    .map(Number)
    .sort((a, b) => a - b);
}

export function priceFor(id: ModalityId, duration: number): number {
  return MODALITIES[id].pricing[duration] ?? 0;
}

export interface Ritual {
  id: string;
  tag: string;
  tagClass: string;
  name: string;
  description: string;
  blocks: Array<{ id: ModalityId; duration: number; option?: string }>;
}

export const RITUALS: Ritual[] = [
  {
    id: "mind-body-reset",
    tag: "Reset & Unwind",
    tagClass: "bg-surface-container-highest text-primary",
    name: "Mind & Body Reset",
    description: "30m Health Coaching followed by 75m Targeted Somatic Massage.",
    blocks: [
      { id: "coaching", duration: 30 },
      { id: "massage", duration: 75, option: "Myofascial Release" },
    ],
  },
  {
    id: "active-recovery",
    tag: "Strength & Relief",
    tagClass: "bg-secondary-fixed text-on-secondary-container",
    name: "Active Recovery",
    description: "60m Resistance Flow paired seamlessly with 60m Deep Tissue bodywork.",
    blocks: [
      { id: "training", duration: 60 },
      { id: "massage", duration: 60, option: "Deep Tissue" },
    ],
  },
  {
    id: "grounded-breath",
    tag: "Deep Presence",
    tagClass: "bg-tertiary-fixed text-tertiary",
    name: "Grounded Breath",
    description: "15m Habit Coaching, 45m Mindful Yoga, & 30m Breathwork & Pranayama.",
    blocks: [
      { id: "coaching", duration: 15 },
      { id: "yoga", duration: 45, option: "Gentle Alignment" },
      { id: "breathwork", duration: 30 },
    ],
  },
];

export function ritualTotals(ritual: Ritual) {
  return ritual.blocks.reduce(
    (acc, b) => ({ price: acc.price + priceFor(b.id, b.duration), minutes: acc.minutes + b.duration }),
    { price: 0, minutes: 0 },
  );
}

/* ---------------------------------------------------------------- Intake --- */

export const TIME_SLOTS = [
  { id: "morning", startMinutes: 9 * 60 + 30, label: "Morning Quietude · Studio East Wing" },
  { id: "afternoon", startMinutes: 14 * 60, label: "Afternoon Gentle Radiance" },
  { id: "evening", startMinutes: 17 * 60, label: "Evening Twilight Restorative" },
] as const;
export type TimeSlotId = (typeof TIME_SLOTS)[number]["id"];

export const FOCUS_AREAS = [
  "Upper Back & Neck",
  "Lumbar Spine",
  "Hips & Pelvic Bowl",
  "Shoulder Girdle",
  "Sciatic Nerve Relief",
  "Cranial & Jaw (TMJ)",
];

export const PRESSURE_LEVELS = ["Gentle", "Moderate", "Firm", "Deep Somatic"] as const;
export type PressureLevel = (typeof PRESSURE_LEVELS)[number];

export const PRESSURE_INTENT: Record<PressureLevel, string> = {
  Gentle: "Gentle & Soothing",
  Moderate: "Moderate & Steady",
  Firm: "Firm & Grounded",
  "Deep Somatic": "Deep & Releasing",
};

export const MOVEMENT_GOALS = [
  { id: "mobility", label: "Thoracic Mobility", goal: "Mobility Restoration" },
  { id: "core", label: "Core Stabilization", goal: "Core Stability" },
  { id: "posture", label: "Posture Realignment", goal: "Postural Balance" },
  { id: "vagal", label: "Vagal Reset (Nervous)", goal: "Stress Release" },
] as const;

export const LIFESTYLE_TOPICS = [
  "Circadian Sleep Hygiene",
  "Morning Breath & Awakening Routine",
  "Micro-Breaks at Desk",
  "Gut & Nervous System Nourishment",
];

export const HEALTH_CONSENTS = [
  {
    id: "noAcuteIllness",
    required: true,
    text: "I am not currently experiencing acute fever, contagious illness, or unmanaged circulatory thrombosis.",
  },
  {
    id: "pregnant",
    required: false,
    text: "I am currently pregnant or suspect I may be pregnant (practitioner requires modified side-lying bolster protocols).",
  },
  {
    id: "bodyworkConsent",
    required: true,
    text: "I consent to somatic bodywork and understand this practice supports nervous regulation and does not replace medical diagnostics.",
  },
] as const;
export type ConsentId = (typeof HEALTH_CONSENTS)[number]["id"];

/** Minutes of grounding transition inserted before the final block. */
export const TRANSITION_MINUTES = 5;
