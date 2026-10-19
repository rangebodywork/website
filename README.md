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
| `npm start`     | Serve the production build (`PORT=4000 npm start` to change the port). Payments fail closed here; use `PAYMENTS_ALLOW_STUB=1 npm start` to try them with the stub |
| `npm run lint`  | ESLint (`eslint-config-next` core-web-vitals + TypeScript)            |
| `npm run icons` | Re-download the Material Symbols subset (see [Icons](#icons))         |
| `npm run test:e2e` | Build, start the production server on port 4300 and run the Playwright suite in `e2e/` |

### End-to-end tests

`e2e/` holds a Playwright suite (`@playwright/test`, dev-only) that drives the production build:

- `flows.spec.ts` covers one customer + admin journey. The admin edits a price and disables a service, and the
  builder and review totals follow. Intake → review → confirm saves one booking. Editing the profile or
  re-confirming adds no duplicate. Reschedule and cancel work on My bookings. Admin add/edit of a class and a
  workshop shows on `/schedule`. A signed-in `/admin` reload logs no hydration errors. Sign-out works.
- `migration.spec.ts` checks the one-time import of a pre-split confirmed booking and that malformed stored data
  is ignored.
- `cross-tab.spec.ts` checks that an admin change in one tab updates an open builder in another, without a reload.
- `payments.spec.ts` runs against the stub gateway. It checks that booking saves a card on file with no charge
  and no card number stored, that cancelling more than 24 hours ahead is free, and that cancelling inside the
  window charges the admin-set fee. It also covers the admin "Charge session" action and a declined charge
  (test card 4000 0000 0000 0002). Further cases: the exact 24-hour boundary (with a pinned clock), free
  reschedules, no fee once the session has been charged, re-confirming with a new card without charging twice,
  and an admin retrying a declined late-cancel fee.

It runs in the locally installed Google Chrome (`channel: "chrome"`), so no browser download is needed. To use
Playwright's bundled Chromium instead, run `npx playwright install chromium` and set `PW_CHANNEL=chromium`. Set
`E2E_PORT` to use a port other than 4300.

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

Pages are prerendered as static content; `/api/payments/*` are server functions. Payments fail closed on
Vercel: preview and production deployments both run with `NODE_ENV=production`, so without Authorize.net keys
the payment routes answer 503. For a demo deployment on the stub, set `PAYMENTS_ALLOW_STUB=1`. When keys arrive,
add the `AUTHORIZE_NET_*` variables (see [Payments](#payments)) under **Project → Settings → Environment
Variables**. Do not give them a `NEXT_PUBLIC_` prefix.

## Route map

The booking flow is **Builder → Intake → Review**. The Schedule page sits beside that flow, and *My bookings*
and *Profile* manage what the client has saved. The admin back-office lives under `/admin` and is not linked
from the customer navigation.

### Customer (`app/(customer)`)

| Route       | Screen (Stitch export)                                               | Purpose                                                                                                                                                                                |
| ----------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`         | Modular Session Builder (`stitch_…scheduler` + `-2`, merged)         | Apply a curated ritual, or toggle modalities and pick durations and techniques. Reorder the sequence by dragging or with the arrow keys. Modality guide sheet. **Continue → `/intake`** |
| `/intake`   | Client Intake & Session Customization (`-3`)                         | Pick a date and time slot. Tailoring sections A/B/C appear only for the selected modalities. Health record is validated; empty contact fields pre-fill from the profile. **Review & Confirm → `/review`** |
| `/review`   | Review Your Customized Session (`-5`)                                | Itinerary, intake summary and pricing, built from your choices. **Save card on file** (no charge) is required first, and the cancellation policy is shown. **Confirm & Reserve** saves the booking and shows a confirmation with `.ics` / Google Calendar export                 |
| `/schedule` | Schedule (`-4`)                                                      | Group classes and workshops (as edited in the admin), with category filters, bookmarks, `.ics` export and mailto reservations                                                         |
| `/bookings` | — (new)                                                              | My bookings, split into Upcoming and Past (past = cancelled/completed, or the date has gone by). Reschedule (date + time picker, free) and Cancel. Cancel asks first and says whether the late-cancellation fee applies, then charges it      |
| `/profile`  | — (new)                                                              | The client's own name, phone and emergency contact. Saved on change; used to pre-fill the next intake. Editing it never touches a confirmed booking                                   |

### Admin (`app/admin`, behind a demo passcode)

| Route              | Purpose                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/admin`           | Dashboard: counts of upcoming bookings, classes and workshops, and the next upcoming sessions sorted by date                                          |
| `/admin/bookings`  | Bookings table (cards on mobile): filter by status, change status, read intake and health notes. Pregnancy, missing required consents and sensitivities are flagged. Payment status (card on file / charged / fee charged / failed) with a **Charge session** action; marking a booking *completed* charges it too |
| `/admin/schedule`  | Add, edit and delete recurring classes and workshops. Changes show on `/schedule`                                                                      |
| `/admin/payments`  | Cancellation-fee amount, late-cancel window (hours) and policy text, shipped as clearly marked placeholders, plus which payment gateway is active |
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
  served with `next/image`. Those URLs are temporary, so no `remotePatterns` config is needed. The
  practitioner avatar (`practitioner.jpg`) is a real studio photo: a face-centred 512px square crop,
  re-encoded as JPEG q82 (~20 KB). The full-size original is kept out of the repo.
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
- **Practitioner name.** The Stitch exports used placeholder names ("Elena Ward", "Elena Vance"). The real
  practitioner is **Steven Rogers**; the name lives once in `PRACTITIONER` (`lib/nav.ts`) and every screen,
  alt text, the meta description and the calendar event read it from there.
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
  admin/             /admin, /admin/bookings, /admin/payments, /admin/schedule, /admin/services + passcode gate, admin nav
  api/payments/      server route handlers in front of the payment gateway
components/          SiteHeader, DesktopNav, BottomNav, SiteFooter, StickyActionBar, Icon, Avatar
  ui/                Chip, Badge, Card primitives
  builder/ intake/ review/ schedule/   screen sections
lib/                 catalog (modalities, rituals, pricing), repository (data layer), booking store + context,
                     formatting, .ics
  payments/          PaymentGateway interface, stub, Authorize.net skeleton, gateway selection, client helpers
public/images/       practitioner headshot (real photo) & studio photography from the Stitch exports
scripts/             fetch-icons.mjs (Material Symbols subset)
docs/                original Stitch exports (unchanged); payments.md (payments design note)
```


## Data layer

`lib/repository.ts` defines a `Repository` interface and its `localStorage` implementation
(`createLocalStorageRepository`). Components never edit the stored data directly:

- **Reads** go through `useDatabase()` (`lib/db-context.tsx`), a `useSyncExternalStore` hook over
  `repository.getSnapshot()`. The server snapshot is the built-in catalog with no bookings, so prerendered HTML
  and the first client render always match.
- **Writes** go through domain methods: `addBooking`, `setBookingStatus`, `rescheduleBooking`, `recordPayment`,
  `upsertClass`, `deleteClass`, `upsertWorkshop`, `deleteWorkshop`, `setModalityEnabled`, `setPricing`,
  `saveProfile`, `savePaymentSettings`. They
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

## Payments

Payments go through Authorize.net, with the merchant account through Chase. **There are no test keys yet, so
everything runs against a stub gateway.** The design, its sources and the questions for the owner are in
[`docs/payments.md`](docs/payments.md).

The business rules, and how they are built:

- **Single sessions are not charged at booking.** On `/review` the customer agrees to keep a card on file and
  saves it before **Confirm & Reserve**. Only a payment-profile reference and brand/last4 are kept on the
  booking (`booking.payment`), never the card number. The studio charges the booking total later, from
  `/admin/bookings` (**Charge session**, or by marking the booking *completed*).
- **Cancelling inside the window** (default 24 hours before start) charges the late-cancellation fee to the card
  on file. Cancelling earlier is free, and the cancel dialog says which case applies before confirming.
- **Rescheduling is free** for now.
- **Packages** (charged immediately) are not built yet. `PaymentGateway.purchase()` exists for them.
- **Policy wording** is a clearly marked placeholder that the admin edits on `/admin/payments`. It shows on
  `/review` and on the confirmation.

How it fits together:

- `lib/payments/gateway.ts` holds the typed, server-side `PaymentGateway` interface: `createCustomerProfile`,
  `getHostedCardForm`, `getStoredCard`, `chargeStoredCard`, `purchase`, `voidTransaction` and `refund`.
- `lib/payments/stub-gateway.ts` holds `StubPaymentGateway`, which is stateless, predictable and logs as
  `[payments:stub]`. Test cards: 4111 1111 1111 1111 approves, and 4000 0000 0000 0002 saves but is declined
  when charged. Any amount ending in `.13` is also declined.
- `lib/payments/authorize-net-gateway.ts` holds `AuthorizeNetGateway`, a skeleton over the JSON API (no SDK).
  Each method throws `PaymentGatewayNotConfiguredError` and has a TODO linking to the relevant doc section.
- `lib/payments/index.ts`: `getPaymentGateway()` uses Authorize.net when the login ID and transaction key are
  set, and the stub otherwise.
- `app/api/payments/*` holds the route handlers the browser calls: `card-form`, `stored-card`, `charge` and
  `status`, plus `stub/hosted-form`, which stands in for the hosted card page and returns 404 when a real
  gateway is configured. The browser never talks to Authorize.net directly.
- `lib/payments/client.ts` holds browser helpers that call those routes and record each attempt through
  `repository.recordPayment`. `lib/payments/policy.ts` holds the late-cancel rule and the placeholder settings.

### Environment variables

Copy `.env.example` to `.env.local`. Real `.env*` files are git-ignored. All of these are server-only, so never
give them a `NEXT_PUBLIC_` prefix.

| Variable | Purpose |
| --- | --- |
| `AUTHORIZE_NET_API_LOGIN_ID` | API Login ID. Leave it empty to use the stub. |
| `AUTHORIZE_NET_TRANSACTION_KEY` | Transaction Key. Leave it empty to use the stub. |
| `AUTHORIZE_NET_SIGNATURE_KEY` | Verifies webhook signatures (`X-ANET-Signature`). Not used until webhooks exist. |
| `AUTHORIZE_NET_ENV` | `sandbox` (the default) or `production`. |
| `PAYMENTS_ALLOW_STUB` | `1` lets a production runtime use the stub when the keys are empty. Leave it unset for real deployments. |

**Fail closed.** In production (`NODE_ENV=production`, which includes `npm start`, or `VERCEL_ENV=production`),
the stub is refused when the keys are empty. Every payment route then answers 503, customers can't save a card,
and `/admin/payments` shows a red "Payments are disabled" banner. `npm run dev` always allows the stub, and the
e2e suite sets `PAYMENTS_ALLOW_STUB=1`. Whenever the stub is active, `/admin/payments` shows a red stub-mode banner.

Setting the keys today switches to the skeleton, which answers 503 ("Payments are not set up yet") until
`AuthorizeNetGateway` is implemented.

### Open questions for the owner

- **Reschedules:** should rescheduling inside the 24-hour window count as a late cancellation and charge the
  fee? For now it is always free.
- **Final policy wording, fee amount and window.** The site ships placeholders, with a $50 fee and 24 hours.
- **No-shows:** charge the full session, the cancellation fee, or nothing?
- **A late-cancel fee that is declined:** the booking is still cancelled and the failure is recorded for
  follow-up. Is that right, or should cancelling be blocked?
- **Promo and gift codes** are saved but not deducted from the charged amount. How should they apply?
- **Authorize.net and Chase details:** sandbox and production keys, CIM enabled on the account, accepted card
  brands, and AVS/CVV requirements. See `docs/payments.md`.

**Trust caveat (demo):** bookings live in the browser's `localStorage`, so the browser sends the amount to
charge, and `/admin` is not really protected. Before taking real payments, bookings and payment records must
move to a server-side store. The charge routes must then work out the amount and cancel timing from that
store, and sit behind real admin authentication.

## Admin passcode — not real security

`/admin` is gated by `DEMO_ADMIN_PASSCODE` (`0000`) in `app/admin/PasscodeGate.tsx`. **This is a demo, not a
security boundary:** the passcode ships in the client bundle, the "session" is a `sessionStorage` flag anyone
can set, and all data is in the visitor's own `localStorage` anyway. A real deployment needs server-side
authentication and a backend behind the `Repository` interface.
