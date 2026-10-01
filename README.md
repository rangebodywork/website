# Soma Studio — Session Builder

A Next.js site built from the five Google Stitch screen exports in [`docs/`](docs/). Clients combine
somatic modalities into one private session, tailor it through an intake, review it and reserve it. There
is also a schedule of group classes and workshops.

- **Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4 (+ `@tailwindcss/forms`)
- **Design system:** "Somatic Sanctuary", from `docs/*/DESIGN.md`. The tokens live in `app/globals.css` (`@theme`)
- **No backend.** Everything lives in the browser's `localStorage` (see [Data layer](#data-layer)): the in-progress
  session under `soma-studio:booking`, and the catalog, schedule, bookings and profile under `soma-studio:db`

## Run locally

Requires Node.js 20.9 or later.

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

| Script          | What it does                                                          |
| --------------- | --------------------------------------------------------------------- |
| `npm run build` | Production build (type-checks as part of the build)                   |
| `npm start`     | Serve the production build (`PORT=4000 npm start` to change the port) |
| `npm run lint`  | ESLint (`eslint-config-next` core-web-vitals + TypeScript)            |
| `npm run icons` | Re-download the Material Symbols subset (see [Icons](#icons))         |

## Deploy to Vercel

`package.json` sits at the repo root, so Vercel detects Next.js without any configuration.

- **Dashboard:** push the repo to GitHub, GitLab or Bitbucket. Then go to **vercel.com → Add New… → Project**,
  import the repo and click **Deploy**. Keep the defaults: framework *Next.js*, root directory `./`, build
  command `next build`.
- **CLI:**
  ```bash
  npm i -g vercel
  vercel          # first run links the project and makes a preview deployment
  vercel --prod   # production deployment
  ```

No environment variables are needed. Every route is prerendered as static content.

## Route map

The booking flow is **Builder → Intake → Review**. The Schedule page sits beside that flow, and *My bookings*
and *Profile* manage what the client has saved. The admin back-office lives under `/admin` and is not linked
from the customer navigation.

### Customer (`app/(customer)`)

| Route       | Screen (Stitch export)                                               | Purpose                                                                                                                                                                                |
| ----------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`         | Modular Session Builder (`stitch_…scheduler` + `-2`, merged)         | Apply a curated ritual, or toggle modalities and pick durations and techniques. Reorder the sequence by dragging or with the arrow keys. Modality guide sheet. **Continue → `/intake`** |
| `/intake`   | Client Intake & Session Customization (`-3`)                         | Pick a date and time slot. Tailoring sections A/B/C appear only for the selected modalities. Health record is validated; empty contact fields pre-fill from the profile. **Review & Confirm → `/review`** |
| `/review`   | Review Your Customized Session (`-5`)                                | Itinerary, intake summary and pricing, built from your choices. **Confirm & Reserve** saves the booking and shows a confirmation with `.ics` / Google Calendar export                 |
| `/schedule` | Schedule (`-4`)                                                      | Group classes and workshops (as edited in the admin), with category filters, bookmarks, `.ics` export and mailto reservations                                                         |
| `/bookings` | — (new)                                                              | My bookings, split into Upcoming and Past (past = cancelled/completed, or the date has gone by). Reschedule (date + time picker) and Cancel (asks first) for upcoming sessions      |
| `/profile`  | — (new)                                                              | The client's own name, phone and emergency contact. Saved on change; used to pre-fill the next intake. Editing it never touches a confirmed booking                                   |

### Admin (`app/admin`, behind a demo passcode)

| Route              | Purpose                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/admin`           | Dashboard: counts of upcoming bookings, classes and workshops, and the next upcoming sessions sorted by date                                          |
| `/admin/bookings`  | Bookings table (cards on mobile): filter by status, change status, read intake and health notes. Pregnancy, missing required consents and sensitivities are flagged |
| `/admin/schedule`  | Add, edit and delete recurring classes and workshops. Changes show on `/schedule`                                                                      |
| `/admin/services`  | Enable/disable each modality and edit its duration → price table and default duration. A disabled modality disappears from the builder, its rituals are hidden, and it is not priced on `/review` |

How the pages connect:

- **Shared header (`components/SiteHeader.tsx`)** has two variants:
  - *brand*: used on `/` and `/schedule`.
  - *flow*: used on `/intake`, `/review`, `/bookings` and `/profile`. It has a back button and a centered title.
- **Customer navigation:** Practices `/`, Schedule `/schedule`, My bookings `/bookings` and Profile `/profile` — in
  the header on md+ screens and in the bottom tab bar on `/schedule`. Practices stays highlighted on `/intake`
  and `/review`, the steps of building a session. The booking steps show their sticky CTA bars instead, as the
  designs do.
- **Admin layout** has its own side navigation (current page marked with `aria-current`), a link back to the
  customer site, and a Sign out button.
- **Footer:** one shared footer, rendered from the customer layout.

## Builder variant choice

Both builder exports share a layout. **Variant 2 (`stitch_multi_service_wellness_scheduler-2`) is the base**
because it is a superset of variant 1. It adds:

- the modality **Guide** bottom sheet
- the Thai Yoga Massage technique, which opens its guide
- the "Group Schedule" header shortcut
- the herbal-infusion reassurance note

Two things were taken from **variant 1** instead:

- **Ritual names.** Variant 2 had overwritten the ritual card titles with modality names ("Private Yoga
  Instruction", "Health & Habit Coaching"), which looks like an editing slip. Variant 1's *Mind & Body
  Reset / Active Recovery / Grounded Breath* are used.
- **Primary color.** Variant 1's `primary` `#33493a` matches `DESIGN.md` and the other three screens.
  Variant 2 used `#4a6151`, which is kept as `primary-container`.

## Design notes and judgement calls

- **Tokens.** Colors, the type scale, named spacing and shadows are ported one-to-one. For radii, the Stitch
  markup expects DEFAULT `.25rem` / lg `.5rem` / xl `.75rem` / 2xl `1rem`, and that is what the screens
  render. `globals.css` keeps those values and notes how `DESIGN.md`'s semantic radius scale maps onto them.
- **Fonts** load through `next/font/google`: Newsreader with the `opsz` axis, and Manrope.
- **Icons.** Material Symbols Outlined is self-hosted through `next/font/local`. The font is a ~50 KB
  variable subset with the FILL, wght, opsz and GRAD axes. The list of glyphs is `lib/icons.ts`, and the
  `<Icon name>` prop is type-checked against it. If you add an icon, add it to that list and run
  `npm run icons`.
- **Images.** The Stitch `lh3.googleusercontent.com` images were downloaded into `public/images/` and are
  served with `next/image`. Those URLs are temporary, so no `remotePatterns` config is needed.
- **Pricing is computed.** Prices come from a per-duration table in `lib/catalog.ts`. The designs showed
  three different totals for the same session ($245 / $265 / $235). The table reproduces the Review
  screen's itemised $35 / $90 / $110 = **$235**, and Mind & Body Reset ($195) and Grounded Breath ($150).
  Active Recovery computes to $200 instead of the design's $220.
- **Default selection.** The builder screen showed Private Yoga checked, but its sequence and totals only
  counted three modalities. So Yoga starts unselected, and the default session is Coaching 15m →
  Training 60m → Massage 60m (2 hrs 15 mins), matching the sequence.
- **Dates are real.** The intake shows the next five days from today. The design's "October 2024" strip
  was static. Friday and Sunday get the terracotta "limited" dot. Slot end times follow the session length.
  The workshop dates moved to upcoming Saturdays (Oct 17 and Nov 7, 2026) so the weekdays are correct.
- **Practitioner name.** The Schedule export said "Elena Ward". It is unified to **Elena Vance**, the name
  used on the other four screens.
- **Intake defaults.** Preference chips (focus areas, pressure, goals, topics) start as shown in the design.
  Name, phone, emergency contact and the health consents start empty; the design's "Siddhartha Roy" etc.
  are placeholders only. Full name, phone and the two required consents are validated before Review.
- **Conditional sections.** Intake sections appear only for the chosen modalities: Bodywork for massage,
  Movement for yoga or training, Lifestyle for coaching. They are lettered A, B, C in order.
- **Actions without a backend:**
  - "Reserve Spot" and "Guest Inquiry" open prefilled emails to the practitioner.
  - "Book in Equinox App" links to equinox.com.
  - The promo code is saved and noted, not validated.
  - Confirm saves the booking to My bookings under a local reference number (`SOMA-XXXXXX`).
  - Editing the session after confirming clears the confirmation; confirming again updates that same booking
    (while it is still upcoming) instead of adding a second one. **Build another session** starts a new one.
- **Desktop layouts** were added; the Stitch screens are all mobile:
  - builder and review: two columns
  - intake: a sticky left column
  - schedule: 2-column card grids
  - header: nav links

## Project layout

```
app/                 root layout, fonts, theme
  (customer)/        /, /intake, /review, /schedule, /bookings, /profile + customer layout
  admin/             /admin, /admin/bookings, /admin/schedule, /admin/services + passcode gate, admin nav
components/          SiteHeader, DesktopNav, BottomNav, SiteFooter, StickyActionBar, Icon, Avatar
  ui/                Chip, Badge, Card primitives
  builder/ intake/ review/ schedule/   screen sections
lib/                 catalog (modalities, rituals, pricing), repository (data layer), booking store + context,
                     formatting, .ics
public/images/       practitioner & studio photography from the Stitch exports
scripts/             fetch-icons.mjs (Material Symbols subset)
docs/                original Stitch exports (unchanged)
```


## Data layer

`lib/repository.ts` defines a `Repository` interface and its `localStorage` implementation
(`createLocalStorageRepository`). Components never edit the stored data directly:

- **Reads** go through `useDatabase()` (`lib/db-context.tsx`), a `useSyncExternalStore` hook over
  `repository.getSnapshot()`. The server snapshot is the built-in catalog with no bookings, so prerendered HTML
  and the first client render always match.
- **Writes** go through domain methods: `addBooking`, `setBookingStatus`, `rescheduleBooking`, `upsertClass`,
  `deleteClass`, `upsertWorkshop`, `deleteWorkshop`, `setModalityEnabled`, `setPricing`, `saveProfile`. They
  return promises, so a real backend can implement the same interface with network calls; the
  `localStorage` version resolves immediately.
- **Stored shape.** `soma-studio:db` is versioned (currently 2). For modalities it stores only the
  admin-editable fields (`disabled`, `pricing`, `defaultDuration`) and merges them onto the code catalog by id,
  so catalog changes in code still reach existing browsers. Malformed entries are dropped rather than crashing
  the app. Rituals always come from code.
- **Pricing** is read from the stored catalog (`priceFor(modality, duration)`), so admin price edits change
  builder, ritual and review totals. If a selected duration is removed, the selection falls back to the
  modality's default duration. Each booking keeps a snapshot of its priced blocks, so later price edits don't
  rewrite past bookings.
- **Migration.** A session confirmed before My bookings existed (stored only under `soma-studio:booking`) is
  copied into the bookings list once, on first load.
- The in-progress session (`lib/booking-store.ts` + `lib/booking-context.tsx`) is still a separate store under
  `soma-studio:booking`. It is per-session scratch state, not shared data.

## Admin passcode — not real security

`/admin` is gated by `DEMO_ADMIN_PASSCODE` (`0000`) in `app/admin/PasscodeGate.tsx`. **This is a demo, not a
security boundary:** the passcode ships in the client bundle, the "session" is a `sessionStorage` flag anyone
can set, and all data is in the visitor's own `localStorage` anyway. A real deployment needs server-side
authentication and a backend behind the `Repository` interface.
