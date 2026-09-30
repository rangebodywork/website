import type { IconName } from "./icons";

export type ScheduleCategory = "equinox" | "immersion" | "sound" | "anatomy";

export const SCHEDULE_FILTERS: Array<{ id: ScheduleCategory | "all"; label: string }> = [
  { id: "all", label: "All Offerings" },
  { id: "equinox", label: "Equinox Weekly Yoga" },
  { id: "immersion", label: "Weekend Immersions" },
  { id: "sound", label: "Sound & Breathwork" },
  { id: "anatomy", label: "Anatomy Clinics" },
];

export interface RecurringClass {
  id: string;
  categories: ScheduleCategory[];
  accent: "primary" | "secondary";
  duration: string;
  level: string;
  location: string;
  title: string;
  description: string;
  when: string;
  whenIcon: IconName;
  venue: string;
  notice: string;
  inquirySubject: string;
}

export const RECURRING_CLASSES: RecurringClass[] = [
  {
    id: "solar-vinyasa",
    categories: ["equinox"],
    accent: "primary",
    duration: "60 min",
    level: "All Levels",
    location: "Equinox SF",
    title: "Morning Solar Vinyasa Flow",
    description:
      "An energizing solar cadence awakening the spine, fascial chains, and breath vitality before the workday unfolds.",
    when: "Tues & Thurs, 7:30 - 8:30 AM",
    whenIcon: "schedule",
    venue: "Equinox Sports Club San Francisco • Main Yoga Studio",
    notice:
      "Book directly via the Equinox Member App or Front Desk. Non-members may inquire with Elena for guest pass reservations.",
    inquirySubject: "Equinox Guest Pass Inquiry - Solar Vinyasa",
  },
  {
    id: "sunset-yin",
    categories: ["equinox", "sound"],
    accent: "secondary",
    duration: "75 min",
    level: "Restorative",
    location: "Equinox Berkeley",
    title: "Sunday Sunset Yin & Sound Bath",
    description:
      "Long restful floor postures supported with organic linen bolsters, concluding in a 30-minute meditative alchemy sound journey.",
    when: "Sundays, 6:00 - 7:15 PM",
    whenIcon: "routine",
    venue: "Equinox Berkeley • Yoga Sanctuary",
    notice:
      "Book via Equinox Member App (opens 26 hours in advance) or Concierge Desk. Non-members contact for guest pass.",
    inquirySubject: "Equinox Guest Pass Inquiry - Sunset Yin",
  },
];

export interface Workshop {
  id: string;
  categories: ScheduleCategory[];
  title: string;
  kicker: string;
  price: number;
  priceNote?: string;
  /** YYYY-MM-DD */
  date: string;
  startMinutes: number;
  durationMinutes: number;
  when: string;
  venue: string;
  description: string;
  image?: { src: string; alt: string };
  includes?: { title: string; items: string[] };
  gear?: { title: string; text: string };
  syllabus?: Array<{ time: string; text: string }>;
}

export const WORKSHOPS: Workshop[] = [
  {
    id: "somatic-release-intensive",
    categories: ["immersion", "sound"],
    title: "Somatic Release & Breathwork Weekend Intensive",
    kicker: "Saturday Intensive",
    price: 145,
    date: "2026-10-17",
    startMinutes: 10 * 60,
    durationMinutes: 240,
    when: "Sat Oct 17 • 10:00 AM - 2:00 PM (4 hrs) • Soma Sanctuary",
    venue: "Soma Sanctuary Studio, 428 Linden Blvd, Suite 201, Hayes Valley",
    description:
      "A nervous system reset combining conscious connected breathing, psoas release therapeutics, and trauma-informed unwinding techniques.",
    image: {
      src: "/images/workshop-sanctuary.jpg",
      alt: "Sunlit somatic studio with linen cushions, plaster walls and singing bowls",
    },
    includes: {
      title: "Direct Registration Includes:",
      items: [
        "Organic ceremonial herbal tea & grounding broth",
        "Hand-bound linen somatic reflection journal & pen",
        "Post-workshop 14-day guided audio practices",
      ],
    },
    syllabus: [
      { time: "10:00 - 11:00 AM", text: "Grounding tea, circle alignment, and nervous-system physiology overview." },
      { time: "11:00 AM - 12:30 PM", text: "Somatic unwinding sequence & diaphragmatic psoas release." },
      { time: "12:30 - 1:30 PM", text: "Conscious circular breathwork journey with vibrational instruments." },
      { time: "1:30 - 2:00 PM", text: "Integration journaling, grounding herbal broth, and closing meditation." },
    ],
  },
  {
    id: "postural-fascial-clinic",
    categories: ["anatomy", "immersion"],
    title: "Postural Alignment & Fascial Bodywork Clinic",
    kicker: "Anatomy Masterclass",
    price: 120,
    priceNote: "materials inc.",
    date: "2026-11-07",
    startMinutes: 13 * 60,
    durationMinutes: 180,
    when: "Sat Nov 7 • 1:00 PM - 4:00 PM (3 hrs) • Soma Loft Studio",
    venue: "Soma Loft Studio, 428 Linden Blvd, Hayes Valley",
    description:
      "Learn hands-on myofascial self-care using cork spheres, reciprocal inhibition techniques, and gait realignment for sustained tension relief.",
    gear: {
      title: "Take-Home Gear Included",
      text: "Includes high-density cork mobility sphere set and illustrated fascial unwinding companion guide.",
    },
  },
];
