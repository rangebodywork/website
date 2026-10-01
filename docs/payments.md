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
| Reschedule | Free for now. See the open questions below. |

## Recommended approach

**Customer Profiles (CIM) + the Accept Customer hosted profile page.** Card
data is typed into Authorize.net's own page, so it never touches our servers.
We only store reference IDs. Charges happen later, on the server, against the
stored profile.

1. When a customer saves a card, the server calls `createCustomerProfileRequest`
   (one per customer, keyed by our own customer ID or email).
2. The server calls `getHostedProfilePageRequest` and returns only the token to
   the browser.
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
6. Card-on-file rules: the first save needs the customer's consent to store the
   card, which is the checkbox on /review. Charges the studio starts itself
   (session charge, late-cancel fee) send `processingOptions.isSubsequentAuth`
   and `subsequentAuthInformation.reason`, for example `delayedCharge` or
   `noShow`. Authorize.net only sets these flags automatically for its
   recurring-billing product (ARB), not for charges against stored profiles.
7. Packages (later): an immediate `authCaptureTransaction` against a saved
   profile, or through Accept Hosted.
8. Corrections use `voidTransaction` before settlement and `refundTransaction`
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
