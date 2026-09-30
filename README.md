# Soma Studio — Session Builder

A Next.js site built from the five Google Stitch screen exports in [`docs/`](docs/). Clients combine
somatic modalities into one private session, tailor it through an intake, review it and reserve it. There
is also a schedule of group classes and workshops.

- **Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4 (+ `@tailwindcss/forms`)
- **Design system:** "Somatic Sanctuary", from `docs/*/DESIGN.md`. The tokens live in `app/globals.css` (`@theme`)
- **No backend.** Booking state is held in a React context, persisted to `localStorage` under `soma-studio:booking`

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

The booking flow is **Builder → Intake → Review**. The Schedule page sits beside that flow.

| Route       | Screen (Stitch export)                                               | Purpose                                                                                                                                                                                |
| ----------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`         | Modular Session Builder (`stitch_…scheduler` + `-2`, merged)         | Apply a curated ritual, or toggle modalities and pick durations and techniques. Reorder the sequence by dragging or with the arrow keys. Modality guide sheet. **Continue → `/intake`** |
| `/intake`   | Client Intake & Session Customization (`-3`)                         | Pick a date and time slot. Tailoring sections A/B/C appear only for the selected modalities. Health record is validated. **Review & Confirm → `/review`**                            |
| `/review`   | Review Your Customized Session (`-5`)                                | Itinerary, intake summary and pricing, built from your choices. **Confirm & Reserve** shows a confirmation with `.ics` / Google Calendar export                                        |
| `/schedule` | Schedule (`-4`)                                                      | Equinox group classes and Soma Studio workshops, with category filters, bookmarks, `.ics` export and mailto reservations                                                              |

How the pages connect:

- **Shared header (`components/SiteHeader.tsx`)** has two variants:
  - *brand*: used on `/` and `/schedule`.
  - *flow*: used on `/intake` and `/review`. It has a back button and a centered title.
- **Desktop navigation:** on md+ screens the header shows Practices `/`, Schedule `/schedule`, Journey
  `/review` and Profile `/intake`.
- **Mobile navigation:** the same four links appear in the bottom tab bar on `/schedule`. The booking steps
  show their sticky CTA bars instead, as the designs do.
- **Footer:** one shared footer, rendered from the root layout.

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
  - Confirm creates a local reference number.
  - Editing the session after confirming clears the confirmation.
- **Desktop layouts** were added; the Stitch screens are all mobile:
  - builder and review: two columns
  - intake: a sticky left column
  - schedule: 2-column card grids
  - header: nav links

## Project layout

```
app/                 routes (/, /intake, /review, /schedule), root layout, fonts, theme
components/          SiteHeader, DesktopNav, BottomNav, SiteFooter, StickyActionBar, Icon, Avatar
  ui/                Chip, Badge, Card primitives
  builder/ intake/ review/ schedule/   screen sections
lib/                 catalog (modalities, rituals, pricing), booking store + context, formatting, .ics
public/images/       practitioner & studio photography from the Stitch exports
scripts/             fetch-icons.mjs (Material Symbols subset)
docs/                original Stitch exports (unchanged)
```
