# Payments design note (Authorize.net, card on file)

Status: **stub only**. We don't have Authorize.net test keys yet, so every
payment call goes through `StubPaymentGateway`. `AuthorizeNetGateway` is a
skeleton that throws "not configured" until it is built against the sandbox.
Facts below were checked against Authorize.net's developer docs on 2026-10-01.

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
   fee) is a **merchant-initiated charge on a stored credential**. It is flagged
   with `processingOptions` per the card-on-file guide (`isSubsequentAuth`, with
   `isStoredCredentials` as the guide prescribes) and
   `subsequentAuthInformation.reason` (`delayedCharge` for the session,
   `noShow` for a late cancel). If the verification returns a network
   transaction ID, it goes in `originalNetworkTransId`. Confirm the exact flag
   combination in the sandbox. Authorize.net only sets these flags
   automatically for its recurring-billing product (ARB), not for charges
   against stored profiles.
7. De-duplication: each charge sends `refId` and `order.invoiceNumber` (booking
   ID plus charge kind), plus a `duplicateWindow` transaction setting (for
   example 120 seconds). Authorize.net then rejects an identical
   resubmission, such as a double click or a retried request, instead of
   charging twice.
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
- `lib/payments/authorize-net-gateway.ts`: the skeleton. Each method has a TODO
  pointing at the doc section above.
- `lib/payments/index.ts`: `getPaymentGateway()` picks the real gateway when
  all `AUTHORIZE_NET_*` env vars are set, and the stub otherwise. Server only.
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
- [ ] **Fail closed.** Done here: in production without keys the stub is refused
      unless `PAYMENTS_ALLOW_STUB=1`. Keep it that way, and never set that
      variable on the live deployment.
- [ ] **Late-cancel window on the server, in the studio's time zone.** Today the
      browser computes it in the visitor's local time.
- [ ] **Replace the inline test card form with the Accept Customer iframe**
      (`getHostedProfilePageRequest` + `hostedProfileIFrameCommunicatorUrl`).
      Delete the `stub/hosted-form` route from the live path.
- [ ] **Reuse one `customerProfileId` per customer** instead of creating a new
      profile each time "Save card on file" is clicked.

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

Not confirmed in the official docs: how long a hosted-profile-page token stays
valid (forum posts say 15 minutes), whether Accept Hosted honours `createProfile`,
and anything specific to Chase.
