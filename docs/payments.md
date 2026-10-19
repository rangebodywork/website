# Payments design note (Authorize.net, card on file)

Status: **sandbox-ready, production refused.** `AuthorizeNetGateway` is built
against the JSON API. Without keys every payment call goes through
`StubPaymentGateway`; with sandbox keys, through the Authorize.net sandbox.
`AUTHORIZE_NET_ENV=production` is refused (payments disabled) unless
`AUTHORIZE_NET_ALLOW_PRODUCTION=1`, which must not be set until the go-live
checklist below is done. The gateway has only been exercised with mocked
responses and a live sandbox auth *failure* (no sandbox keys yet): run the
[manual sandbox test flow](#manual-sandbox-test-flow) once keys arrive.
Facts below were checked against Authorize.net's developer docs on 2026-10-01,
and the request fields again on 2026-10-19 against the API schema.

## Business rules (from the owner)

| Case | What happens to the card |
| --- | --- |
| Single-session booking | **No charge at booking.** The card is saved on file, then charged the booking total at or after the session. |
| Packages (later) | Charged immediately as a purchase. Not built yet, but the gateway already has `purchase()`. |
| Cancel more than 24h before start | Free. |
| Cancel within 24h of start | A cancellation fee is charged to the card on file. The admin sets the fee amount and the window. |
| Cancelled by the studio (admin sets status to cancelled) | Free. Only a cancellation the customer makes can incur the fee. |
| Reschedule | Free for now. See the open questions below. |

## Recommended approach

**Customer Profiles (CIM) + the Accept Customer hosted profile page.** Card
data is typed into Authorize.net's own page, so it never touches our servers.
We only store reference IDs. Charges happen later, on the server, against the
stored profile.

1. When a customer saves a card, the server calls `createCustomerProfileRequest`
   (one per customer, keyed by our own customer ID or email).
2. The server calls `getHostedProfilePageRequest` and returns only the token to
   the browser. It sets `hostedProfileValidationMode: "liveMode"`, so the issuer
   verifies the card with a $0 (or $0.01, voided) authorization when it is
   saved. A bad card then fails at booking, not on the day of the session.
3. The browser shows `https://accept.authorize.net/customer/addPayment` in an
   iframe, posting that token. The sandbox host is `test.authorize.net`.
   `hostedProfileIFrameCommunicatorUrl` points at a small page we host, which
   passes messages from the iframe back to our page.
4. After the customer saves, the server reads the new
   `customerPaymentProfileId` (from `getCustomerProfileRequest`) and the masked
   card number. The booking stores `{ customerProfileId, paymentProfileId,
   last4, brand }` and nothing else.
5. At or after the session, an admin action has the server send
   `createTransactionRequest`. That request uses `transactionType:
   "authCaptureTransaction"`, `amount`, and `profile: { customerProfileId,
   paymentProfile: { paymentProfileId } }`. The late-cancel fee goes through the
   same call with a different amount.
6. Card-on-file (stored credential) rules. The customer consents to storing the
   card when saving it, which is the checkbox on /review. There is **no charge at
   booking**, so there is no earlier customer-initiated purchase for later
   charges to reference. The `liveMode` verification at save time is the
   card-on-file setup instead. Every later charge (session total, late-cancel
   fee) is a **merchant-initiated charge on a stored credential**. Built as:
   `processingOptions: { isSubsequentAuth: "true" }` and
   `subsequentAuthInformation: { reason }`, with `delayedCharge` for the session
   and `noShow` for a late cancel. `isStoredCredentials` is *not* sent: the
   card-on-file guide reserves it for charges "initiated by a customer using the
   merchant's stored COF data" (we use it in `purchase()` with a saved card).
   The guide writes the reasons in lower case (`delayedcharge`, `noshow`); the
   schema's `merchantInitTransReasonEnum` has `delayedCharge` / `noShow`, and the
   schema is what the API validates, so we follow it. We don't send
   `originalNetworkTransId`: per the guide, "Customer profiles automatically send
   the original network transaction ID from the first transaction submitted for
   the payment profile". Authorize.net only sets the MIT flags themselves for
   its recurring-billing product (ARB), not for charges against stored profiles.
7. De-duplication: each charge sends `refId` (booking ID plus charge kind) and a
   deterministic 20-character `order.invoiceNumber` (a hash of the booking ID
   plus `-S` session / `-F` fee), plus a `duplicateWindow` of 120 seconds.
   Authorize.net then rejects an identical resubmission, such as a double click
   or a retried request, instead of charging twice. Saving a card for a
   customer who already has a profile (`E00039`) reuses that profile.

   **Unknown outcomes.** A charge that times out, loses its connection, gets an
   HTTP error or unreadable answer after being sent, or is rejected as a
   duplicate (transaction error 11, meaning an identical charge went in within
   two minutes) returns `{ ok: false, code: "unknown" }`. The browser does the
   same when our own route doesn't answer cleanly (no response or a 5xx other
   than 503). The booking's payment status becomes `unknown`: nothing charges it
   automatically, other charges on it wait, and the admin sees "Outcome unknown
   — check Authorize.net before retrying". The admin's retry sends
   `reconcile: true`; the charge route then looks for the earlier attempt by
   invoice number in `getTransactionListForCustomerRequest` (that customer and
   payment profile) and `getUnsettledTransactionListRequest`, and only charges
   if neither has a matching approved or pending transaction. A match is
   recorded as the charge; a failed lookup leaves the outcome unknown. These
   are Transaction Reporting calls; if the account has the Transaction Details
   API turned off they fail, and the retry is refused rather than risked.
8. Packages (later): an immediate `authCaptureTransaction` against a saved
   profile, or through Accept Hosted.
9. Corrections use `voidTransaction` before settlement and `refundTransaction`
   after it (up to the captured amount, by default within 180 days).

**Why not an authorization-only hold at booking?** Authorize.net expires
"Authorization Only transactions that are not captured within 30 days of
authorization". Card issuers often drop the hold on the customer's statement
well before that, though that is general industry experience, not an
Authorize.net statement. Sessions can be booked weeks out and the final amount
can change (fees, promo codes, reschedules). A stored payment profile charged
when the session happens has none of these problems.

**Why not Accept.js?** Accept.js returns a one-time token (`opaqueData`, valid
for 15 minutes) that can create a payment profile. With our own card form,
though, it puts us in PCI SAQ A-EP. Only Accept.js's hosted form, or the Accept
Customer / Accept Hosted pages, keep us at SAQ A. The hosted profile page also
lets the customer manage saved cards with no extra work on our side.

**Accept Hosted** (`getHostedPaymentPageRequest`, token valid for 15 minutes,
SAQ A) is the natural fit for package purchases later. It shows the customer's
existing payment profiles when given a `customerProfileId`, and it can add new
ones (`hostedPaymentCustomerOptions.addPaymentProfile`).

**Webhooks (later):** we would subscribe to transaction and payment-profile
events. Each notification must be checked with HMAC-SHA512 over the request
body, using the Signature Key, against the `X-ANET-Signature` header.

## How it maps to the code

- `lib/payments/gateway.ts`: the `PaymentGateway` interface and the types its
  methods use.
- `lib/payments/stub-gateway.ts`: a predictable stub. Card number 4000 0000
  0000 0002, or any amount ending in .13, is declined. Card numbers are never
  stored or logged.
- `lib/payments/authorize-net-gateway.ts`: the Authorize.net JSON API client.
  Request members follow the schema's element order (the JSON is converted to
  XML), responses have their byte order mark stripped, and API errors become
  `PaymentGatewayError` with Authorize.net's own message (never the keys).
- `lib/payments/index.ts`: `getPaymentGateway()` picks the real gateway when
  the login ID and transaction key are set, and the stub otherwise. Server
  only. Production is refused without `AUTHORIZE_NET_ALLOW_PRODUCTION=1`.
- `lib/payments/health.ts`: `authenticateTestRequest` behind
  `npm run payments:check` and `GET /api/payments/health` (cached 60 s). On an
  authentication failure (`E00007`/`E00008`), `payments:check` also asks the
  other environment, to say "these look like production keys but
  AUTHORIZE_NET_ENV=sandbox" rather than just "failed". The public health
  route only calls the configured environment. Its 60 s cache lives in each
  server instance's memory, not in shared storage: with several Vercel
  instances (or cold starts) Authorize.net can see more than one check a
  minute, and after a key change instances may disagree for up to a minute.
  That is acceptable for a credential check; it is not a hard rate limit.
- `lib/payments/binding.ts`: Authorize.net customer profile ids are sequential
  numbers, so the browser never acts on a bare id. `card-form` returns
  `profileToken` = HMAC-SHA256 of the id keyed by `PAYMENTS_SESSION_SECRET`;
  card-form reuse, `stored-card` and `charge` answer 403 unless it matches.
  The booking keeps the token next to the profile reference. This stops
  guessing, not a stolen token: real customer accounts are still on the
  go-live checklist.
- `components/review/SaveCardStep.tsx`: with a real gateway, POSTs the token
  into an iframe showing the hosted add-payment page.
  `public/payments/iframe-communicator.html` (based on Authorize.net's sample)
  relays `successfulSave` / `cancel` / `resizeWindow` back. Authorize.net only
  takes an https communicator URL, so on a plain-http dev server the customer
  clicks "I've saved my card" instead. Either way the server then reads the
  profile's newest card (the hosted page doesn't tell the browser its id).
- `app/api/payments/*`: route handlers. The browser only ever talks to these,
  never to Authorize.net.
- `lib/repository.ts`: bookings carry a `payment` record (profile reference,
  last4/brand, status, transactions). Settings hold the fee, window and policy
  text.

> Trust boundary: while bookings live in localStorage, the browser sends the
> amount to charge. Once a real backend stores bookings, the charge routes must
> look up the amount and the cancel timing themselves, from server-side
> records, rather than trusting the request.

## Must change before going live

The stub build is fine for demos. Before taking real money:

- [ ] **The server owns bookings and amounts.** Move bookings and payment records
      off `localStorage` to a server-side store. The charge routes look up the
      amount from that store instead of accepting it from the browser.
- [ ] **Authenticated admin, and profile routes bound to the customer.** Real
      admin login for charges and settings. Card-form and stored-card routes
      only act on the signed-in customer's own customer profile.
- [ ] **Idempotency.** An idempotency key per charge (`refId`/`invoiceNumber` +
      `duplicateWindow`). Records go `pending` → `settled`/`declined`, and are
      reconciled by webhooks (`X-ANET-Signature` verified with the Signature Key).
- [ ] **Production stays refused until this list is done.** Only then set
      `AUTHORIZE_NET_ALLOW_PRODUCTION=1` with `AUTHORIZE_NET_ENV=production` and
      the production keys, in Vercel's Production environment only.
- [ ] **Fail closed.** Done here: in production without keys the stub is refused
      unless `PAYMENTS_ALLOW_STUB=1`. Keep it that way, and never set that
      variable on the live deployment.
- [ ] **Late-cancel window on the server, in the studio's time zone.** Today the
      browser computes it in the visitor's local time.
- [ ] **Accept Customer iframe.** Built (`getHostedProfilePageRequest` +
      `hostedProfileIFrameCommunicatorUrl`); verify it in the sandbox on an
      https Preview deployment, where the communicator works. The
      `stub/hosted-form` route already answers 404 with a real gateway.
- [ ] **Reuse one `customerProfileId` per customer** instead of creating a new
      profile each time "Save card on file" is clicked.

## Environment variables and where to set them

All server-only: never prefix them with `NEXT_PUBLIC_`. Locally they go in
`.env.local` (git-ignored); on Vercel under Project → Settings → Environment
Variables.

| Variable | Vercel Preview | Vercel Production (for now) | Notes |
| --- | --- | --- | --- |
| `AUTHORIZE_NET_API_LOGIN_ID` | sandbox login ID | empty | Empty means the stub (refused in production runtimes). |
| `AUTHORIZE_NET_TRANSACTION_KEY` | sandbox transaction key | empty | |
| `AUTHORIZE_NET_ENV` | `sandbox` (or empty) | empty | Defaults to `sandbox`. Anything other than `sandbox`/`production` disables payments. |
| `PAYMENTS_SESSION_SECRET` | `openssl rand -hex 32` | empty (its own value at go-live) | Required with Authorize.net keys, else payments are disabled. Signs `profileToken`; see below. |
| `AUTHORIZE_NET_SIGNATURE_KEY` | sandbox signature key (optional) | empty | 128 hex characters; checked by the health check. Webhooks are not built yet. |
| `AUTHORIZE_NET_ALLOW_PRODUCTION` | empty | empty | `1` allows `AUTHORIZE_NET_ENV=production`. **Not until the go-live checklist is done.** |
| `PAYMENTS_ALLOW_STUB` | empty (or `1` for a stub demo) | empty | Never on the live site. |

With Production left empty, https://www.rangebodywork.com/api/payments/status
keeps answering `{"mode":"disabled"}`.

## Manual sandbox test flow

1. Sign up for a sandbox account at
   https://developer.authorize.net/hello_world/sandbox.html and copy its API
   Login ID and Transaction Key (Account → Settings → Security Settings → API
   Credentials & Keys). Optionally create a Signature Key on the same screen.
2. Put them in `.env.local` (`AUTHORIZE_NET_ENV=sandbox` or empty) together
   with `PAYMENTS_SESSION_SECRET=$(openssl rand -hex 32)`, and run
   `npm run payments:check`. Expect `mode: sandbox`, `result: PASS`,
   `I00001 Successful.` A `FAIL` with "These look like production keys" means
   the keys came from the merchant (production) account, not the sandbox.
3. `npm run build && npm start` (or set the variables in Vercel Preview and use
   the Preview URL; there the iframe communicator works because it is https).
   `GET /api/payments/status` → `{"mode":"sandbox"}`;
   `GET /api/payments/health` → `credentialsOk: true`.
4. Book a session through `/intake` → `/review`. Tick the consent box, click
   **Save card on file**: Authorize.net's own card page loads in the frame
   (labelled "Sandbox"). Use a test card from Authorize.net's testing guide
   (https://developer.authorize.net/hello_world/testing_guide.html):
   - Visa `4111 1111 1111 1111` (also `4007 0000 0000 027`, `4012 8888 1888 8`)
   - Mastercard `5424 0000 0000 0015` or `2223 0000 1030 9703`
   - American Express `3700 0000 0000 002` (4-digit code)
   - Discover `6011 0000 0000 0012`
   Any expiry date after today; any 3-digit code (4 for Amex). To make a charge
   decline, give the card billing ZIP code `46282` ("This transaction has been
   declined", response code 2). The guide says the old amount-based decline
   triggers no longer work reliably.
5. After **Save card**, the page shows "Visa ending 1111 saved" (on http, click
   **I've saved my card**). **Confirm & Reserve**. No transaction appears in
   the sandbox Merchant Interface (https://sandbox.authorize.net) other than,
   possibly, the `liveMode` card verification.
6. `/admin/bookings` → **Charge session**. The row shows *Charged*; the
   sandbox Merchant Interface shows an Authorization/Capture for the session
   total with invoice number `…-S`. The UI won't charge twice; if the same
   charge is resubmitted within two minutes anyway, Authorize.net rejects it as
   a duplicate.
7. Book again, set the late-cancel fee on `/admin/payments`, and cancel the
   booking inside the window from `/bookings`. The fee is charged (invoice
   `…-F`) and the booking is cancelled.
8. Repeat step 4 with ZIP `46282` and charge it: the booking records a declined
   charge with Authorize.net's message.

The automated version is `e2e/sandbox.spec.ts` (steps 4–7). It runs as part of
`npm run test:e2e` only when sandbox keys are set, and skips itself otherwise.
Its selectors for Authorize.net's hosted form fields are unverified until it
has run against the sandbox once.

## What we need from the owner

- **API Login ID** and **Transaction Key**, from Account → Settings → Security
  Settings → API Credentials & Keys. Sandbox keys first, then production keys.
- **Signature Key**, from the same screen, to verify webhooks.
- Whether to use the **sandbox or production** account. The sandbox is a
  separate signup at developer.authorize.net with its own keys and endpoints.
- **CIM enabled** on the production account. Only the account owner can turn it
  on (Merchant Interface → Customer Information Manager → Sign Up). It may carry
  a monthly fee.
- **Chase specifics:** confirm that the Chase merchant account is connected to
  this Authorize.net gateway, which card brands are accepted, and whether Chase
  requires an address check (AVS) or the card security code (CVV) on saved
  cards. We could not find any Chase-specific Authorize.net documentation.
- **Final cancellation-policy wording, fee amount and window.** The site ships
  with clearly marked placeholders that the admin can edit.

## Sources

- Customer Profiles (CIM) guide, including Accept Customer / hosted profile page:
  https://developer.authorize.net/api/reference/features/customer-profiles.html
- API reference (createCustomerProfile, getHostedProfilePage,
  createTransaction): https://developer.authorize.net/api/reference/index.html
- API schema (field names checked): https://api.authorize.net/xml/v1/schema/AnetApiSchema.xsd
- Accept Hosted: https://developer.authorize.net/api/reference/features/accept-hosted.html
- Accept.js and PCI SAQ levels: https://developer.authorize.net/api/reference/features/acceptjs.html
- Payment transactions (auth-only expiry, void, refund):
  https://developer.authorize.net/api/reference/features/payment_transactions.html
- Unsettled auth-only expiry, support article:
  https://support.authorize.net/knowledgebase/article/000001346/en-us
- Card-on-file / stored credentials:
  https://developer.authorize.net/api/reference/features/card-on-file.html
- Webhooks and signature verification:
  https://developer.authorize.net/api/reference/features/webhooks.html
- Enabling CIM on an account: https://support.authorize.net/knowledgebase/article/KA-04443/en-us
- Sandbox signup: https://developer.authorize.net/hello_world/sandbox.html

- Sandbox testing guide (test cards, decline ZIP 46282):
  https://developer.authorize.net/hello_world/testing_guide.html
- IFrame communicator sample:
  https://github.com/AuthorizeNet/accept-sample-app/blob/master/IFrameCommunicator.html

Not confirmed in the official docs: how long a hosted-profile-page token stays
valid (forum posts say 15 minutes), whether Accept Hosted honours `createProfile`,
and anything specific to Chase.
