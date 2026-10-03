# SOP Mojo Pay

Checkout Ryan owns, at **https://pay.sopmojo.com**. Framer stays the marketing site and only links or embeds this app. This folder is its own Next.js app. Set the Vercel project **Root Directory** to `pay`.

Stripe integration: **Checkout Sessions with `ui_mode: "elements"` and the Payment Element** (`@stripe/react-stripe-js/checkout`). The full checkout page and the slide-out (`?embed=1`) render the icon, title, description, price, email, annual checkbox, order bump, and Payment Element together on first paint. The Checkout Session is created without an email, so the card fields are not a second step. Email is required before Pay. Typing an email calls `updateEmail` and updates that same session (metadata and receipt email). Annual and order-bump changes update line items on that session. Apple Pay and Google Pay stay on the Payment Element.

## Run

```bash
cd pay
npm install
npm test
npm run lint
npm run dev
```

Open http://localhost:3000. The dashboard is http://localhost:3000/admin.

## Environment

Copy `.env.example` to `.env.local`. Do not put live Stripe keys in the repo. The in-app mode toggle defaults to **test**.

| Name | Required | Notes |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | To take a test payment | Stripe **test** secret (`sk_test_…`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | To take a test payment | Stripe **test** publishable (`pk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | To unlock after pay | Signing secret for `POST /api/webhooks/stripe` |
| `STRIPE_LIVE_SECRET_KEY` | Only after the dashboard is switched to live | Live secret. Leave unset until then. |
| `NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY` | Same | Live publishable key |
| `STRIPE_LIVE_WEBHOOK_SECRET` | Same | Live webhook signing secret |
| `ADMIN_ACCESS_CODE` | To edit the catalog | A password Ryan types at `/admin`. This is the gate. |
| `ADMIN_EMAILS` | No | Comma-separated allowlist. Defaults to `ryan@sopmojo.com`. |
| `ADMIN_SESSION_SECRET` | No | Signs the session cookie. Falls back to `ADMIN_ACCESS_CODE`. |
| `RESEND_API_KEY` | For the magic link, and for credential email if Make is unset | Same pattern as AI SOP Writer. |
| `EMAIL_FROM` | No | Defaults to `SOP Mojo <onboarding@resend.dev>`, which only delivers to the Resend account address until a domain is verified. |
| `NEXT_PUBLIC_SUPABASE_URL` | For unlock + credential email | Shared Builder Supabase project (same one as Flowchart Studio). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | With the URL | Anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | For unlock + credential email | Server only. Never `NEXT_PUBLIC_`. |
| `ENTITLEMENT_WEBHOOK_SECRET` | For unlock | Same secret Studio’s `POST /api/webhooks/entitlements` expects. `MAKE_WEBHOOK_SECRET` is accepted as an alias. |
| `ENTITLEMENTS_WEBHOOK_URL` | No | Defaults to `https://flowchart.sopmojo.com/api/webhooks/entitlements`. |
| `MAKE_CREDENTIALS_WEBHOOK_URL` | To send the username/password email through Make | See fulfillment below. |
| `MAKE_CREDENTIALS_WEBHOOK_SECRET` | No | Sent as `x-make-secret` when set. |
| `MAILCHIMP_API_KEY` | No | Fail-soft. Same audience as the other apps (`7c2226f741`, tag `checkout`). Override with `MAILCHIMP_AUDIENCE_ID`. |
| `NEXT_PUBLIC_PAY_ORIGIN` | No | Public links default to `https://pay.sopmojo.com`. Do not point this at `*.vercel.app`. |

Apply [`supabase/pay.sql`](supabase/pay.sql) on the shared Builder project before production catalog edits or live webhooks. Without those tables, the two built-in products still load from code, but Vercel cannot store catalog edits, and a Stripe retry that lands on another instance can send a second credential email.

## Products

Built in:

- **Flowchart Plus** (`flowchart_plus`) — $19 once. Public page. Entitlement `flowchart_plus`.
- **Builder Pro** (`builder_pro`) — $39/month, with an annual checkbox at $390/year (2 months free). Slide-out. Entitlement `builder_pro`.

Add another product in the dashboard with the same fields (icon, title, description, price, public-page SEO, presentation, entitlement). The seed in `lib/seed.ts` is the same schema.

Checkout (`/checkout/[id]`) is `noindex` in the meta robots tag and the `X-Robots-Tag` header. `/p/[id]` is the indexable product page and is the only place the SEO title, description, and JSON-LD are rendered. The catalog form fills the SEO title and description from the product title, description, and price, and you can edit those two. JSON-LD is generated from those fields plus the public URL. Clearing an SEO field makes it follow the product again. Checkout does not use them.

## Framer: link vs slide-out

Each product has one stable link and one embed snippet. Paste **both** into Framer once.

- Link: `https://pay.sopmojo.com/go/flowchart_plus`
- Snippet: the script tag plus the same link, from the dashboard.

`embed.js` reads the product’s current presentation from this app:

- **Full checkout page** — the click goes to `/checkout/[id]`.
- **Slide-out panel** — the click stays on the Framer page and opens a panel with the same checkout inside.

Changing the toggle in the dashboard changes that behavior. The Framer page does not need another edit. A click with no script (email, new tab) still lands on the checkout page.

## After pay

Stripe webhooks are the source of truth. The handler is idempotent on the Stripe **event id** (`pay_stripe_events`). A retry does not create a second user or send a second password email (`pay_credential_sends`).

What we do, and what we do not do:

1. Look up the Supabase Auth user by email (`entitlement_user_id_by_email`).
2. If there is no user, **Pay creates exactly one** confirmed user and keeps the password long enough to email it. Studio’s entitlements webhook is then called with `{ email, product, active }`. That webhook finds the user and only sets the flag. It does not change the password.
3. The password email goes to **Make** when `MAKE_CREDENTIALS_WEBHOOK_URL` is set, with `action: "email_credentials_only"` and `do_not_create_user: true`. Make must send the username (the email) and password and **must not create a Supabase user**. Creating one there would fight the user Pay already created.
4. If Make is unset and `RESEND_API_KEY` is set, Pay sends that same email itself.
5. If the email already had a Supabase user, the password is not changed and no credential email is sent. The entitlement flag is still set.
6. If neither mailer is set, the webhook returns 500 so Stripe retries until one is set. Access is granted on the first attempt; the retry sends the email.
7. Calling Make’s old “create the user” scenario **and** the entitlements webhook together is the wrong path. That can create two users or email a password that does not match. It is not what this app does.

Also handled:

- Decline (`payment_intent.payment_failed` and invoice/checkout payment failures) — recorded, no unlock.
- Renewal (`invoice.paid` with `subscription_cycle`) — keeps the entitlement, does not email a new password.
- Cancel (`customer.subscription.deleted`, or status `canceled` / `unpaid` / `incomplete_expired`) — sets that product’s flag to false.
- Refund (`charge.refunded`) — revokes the products on that charge. The other product is left alone.

The buyer’s email is added to the existing Mailchimp audience as a `checkout` tag. A Mailchimp failure does not stop checkout or unlock.

The page creates the Checkout Session before the buyer types an email. Payment mode sets `customer_creation: "always"`. Subscription mode lets Checkout create the customer from the email collected at pay. `/account` opens the Customer Portal for the newest Stripe customer with that email. Nothing asks Ryan to paste a customer id.

## Money ops Ryan still has to turn on in Stripe

These are account settings, not code. Checkout does not pretend they are done.

- **Stripe Tax.** Every session is created with `automatic_tax.enabled`. If Tax is not activated (origin address and a registration), Stripe returns an error, the charge is retried **without** tax, and the dashboard shows that blocker. Do not treat a test purchase as tax-complete until the notice is gone.
- **Receipts.** One-time charges set `receipt_email` and `invoice_creation`. Subscription invoices email only if Stripe Customer emails are on (successful payments / finalized invoices).
- **Customer Portal.** `/account` calls the Billing Portal API. Stripe returns an error until the portal is configured in the Dashboard. The page shows that error.
- **Apple Pay domain.** Add `pay.sopmojo.com` under Stripe payment-method domains so Apple Pay works on the real host. Google Pay and cards work without that step when Stripe enables them for the account.

## DNS

Do not attach `pay.sopmojo.com` from this repo. Canonical links already use that host. Point the subdomain at the Vercel project when you are ready, as its own project with Root Directory `pay`.
