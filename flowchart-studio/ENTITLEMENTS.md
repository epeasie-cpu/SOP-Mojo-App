# Flowchart Plus and Builder Pro entitlements

Shared source of truth for Flowchart Studio (`flowchart.sopmojo.com`) and the Builder AppGate (`builder.sopmojo.com` / mojo-sop-builder). Both apps read the same Supabase row. Do not keep a second flag store.

## Product rules

| Product | SamCart | Price | `flowchart_plus` | `builder_pro` | Print + PNG/JSON export | Export to Builder / attach |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | Free | false | false | No | No |
| Flowchart Plus | slug `flowchart-studio` | $19 one-time | true | false | Yes | No |
| Builder Pro | slug `builder-pro` | $39/mo | false (column may stay false) | true | Yes | Yes |

Print and file export are allowed when `flowchart_plus OR builder_pro`. Export to Builder is allowed only when `builder_pro`. A Builder customer does not need the $19 product. Buying Flowchart Plus does not set `builder_pro`. Studio signup / “Create account” does not set either flag.

Checkout URLs:

- Flowchart Plus: `https://rpease1.mysamcart.com/checkout/flowchart-studio` (`FLOWCHART_DEFAULT_CHECKOUT`)
- Builder Pro: `https://rpease1.mysamcart.com/checkout/builder-pro#samcart-slide-open-left`

## Schema

Apply [`supabase/migrations/20260925_entitlements.sql`](./supabase/migrations/20260925_entitlements.sql) on the **shared Builder Supabase project** (the same project as `public.flowchart_maps`). Not the Client Systems project.

Table: `public.entitlements`

| Column | Type | Meaning |
| --- | --- | --- |
| `user_id` | `uuid` primary key, FK → `auth.users(id)` on delete cascade | The Supabase Auth user |
| `email` | `text` not null | Purchase email, stored lowercase. Unique on `lower(email)` |
| `flowchart_plus` | `boolean` not null default `false` | Flowchart Plus $19 |
| `builder_pro` | `boolean` not null default `false` | Builder Pro $39/mo |
| `updated_at` | `timestamptz` not null default `now()` | Set on update by trigger |

RLS is on. `authenticated` may `select` where `user_id = auth.uid()`. There is no insert/update/delete policy. The webhook uses the service role, which bypasses RLS.

Helper (service role only): `public.entitlement_user_id_by_email(target_email text) returns uuid`.

## How Studio reads the flags

After sign-in, the browser calls:

`GET /api/entitlements`

with `Authorization: Bearer <Supabase access token>`.

That route verifies the token at `{SUPABASE_URL}/auth/v1/user`, then reads:

```
GET {SUPABASE_URL}/rest/v1/entitlements?user_id=eq.{uid}&select=flowchart_plus,builder_pro
```

Headers: `apikey: <anon key>` and `Authorization: Bearer <user access token>`. RLS returns only that user’s row. No row means both flags are false. The response is:

```json
{
  "flowchart_plus": false,
  "builder_pro": false,
  "can_print_export": false,
  "can_export_to_builder": false,
  "source": "none",
  "qa_applied": false
}
```

`source` is `"account"` when the row granted access, `"qa"` when the QA bypass added access, and `"none"` when locked.

The client does not treat `localStorage` as the gate. On load it deletes `flowchart-studio-unlocked` and `flowchart-studio-unlock-source`.

### Builder AppGate

Read the same columns. Do not invent `profiles.flowchart_plus` unless you also migrate this table. This monorepo has no shared `profiles` migration; `public.entitlements` is the contract.

```sql
select flowchart_plus, builder_pro
from public.entitlements
where user_id = auth.uid();
```

Same semantics: print/export if either flag is true; attach / AppGate for Builder only if `builder_pro` is true. A missing row is locked.

## Studio gates

- Print and Export buttons call `GET /api/entitlements` again and require `flowchart_plus OR builder_pro`.
- `POST /api/handoff` (deprecated file handoff) requires the same.
- Export to Builder calls Studio, not Builder, first:
  - `GET /api/studio/sops`
  - `GET /api/studio/sops/{sopId}/steps`
  - `POST /api/studio/attach`
- Those routes require `builder_pro`, then forward the user bearer token to `https://builder.sopmojo.com/api/studio/*`. Flowchart Plus receives `403` `builder_pro_required`.

## QA bypass (off in production)

Server env `FLOWCHART_QA_UNLOCK=1` (not `NEXT_PUBLIC_`). Unset or `0` on Vercel production.

With the flag on, Studio honors the query on `GET /api/entitlements` and the header `x-flowchart-qa-unlock` on `/api/studio/*` and `/api/handoff`:

| Value | Effect |
| --- | --- |
| `?unlock=1`, `true`, `yes`, `standalone`, `flowchart-plus` | Print + export only |
| `?unlock=builder-pro` (also `builder`) | Print, export, and Export to Builder |

Try URLs when the flag is on (local or a non-prod deploy):

- `http://localhost:3000/?unlock=1`
- `http://localhost:3000/?unlock=builder-pro`
- `https://flowchart.sopmojo.com/?unlock=1` only if that deployment has the env var

The bypass is not written to `localStorage`. With the env off, those URLs stay locked. The toolbar shows “QA unlock” only when the server actually applied it.

Export to Builder still needs a signed-in Builder session so the proxy can forward a bearer token. QA does not mint a Supabase user.

## Webhook

`POST https://flowchart.sopmojo.com/api/webhooks/entitlements`

Auth (one of):

- `Authorization: Bearer <ENTITLEMENT_WEBHOOK_SECRET>`
- `x-webhook-secret: <secret>`
- `x-make-secret: <secret>`

`MAKE_WEBHOOK_SECRET` is accepted if `ENTITLEMENT_WEBHOOK_SECRET` is unset. If neither is set, the route returns 503. A wrong secret returns 401 and does not touch Supabase.

Preferred body (what Make should send):

```json
{
  "email": "buyer@example.com",
  "product": "flowchart_plus",
  "active": true
}
```

`product` may also be `builder_pro`. SamCart slugs and names are accepted too: `flowchart-studio`, `flowchart-plus`, `Flowchart Plus`, `builder-pro`, `Builder Pro`.

Also accepted: `customer.email`, `customer_email`, `order.customer.email`, `product.slug`, `product.name`, `product_slug`.

`active: false`, or a `type` / `status` / `event` containing refund, cancel, revoke, chargeback, or expired, sets that one flag to false and leaves the other flag alone.

Response:

```json
{
  "ok": true,
  "user_id": "uuid",
  "email": "buyer@example.com",
  "product": "flowchart_plus",
  "active": true,
  "created_user": false,
  "flowchart_plus": true,
  "builder_pro": false
}
```

### Match or create the Auth user

1. `entitlement_user_id_by_email` looks up `auth.users` by email.
2. If missing, Studio calls `POST /auth/v1/admin/users` with `email_confirm: true` and a random password that is **not** returned, logged, or emailed.
3. If the email already exists, the password is not changed.
4. The entitlement row is upserted on `user_id`. Only the product in the payload is written.

Make may create the Auth user first in the same Supabase project. The webhook will find that email and only set the flag.

Studio does not add a new password-reset screen. The buyer sets a password through the existing Builder / Supabase recovery flow. First login stays the shared Supabase password grant already used by Studio sign-in.

## Make / SamCart steps for Ryan

Use two scenarios (or one scenario with a router). Both hit the same Studio URL. Point SamCart at Make the way the Builder product already does; Studio does not embed SamCart’s order IPN itself.

### 1. Flowchart Plus — product slug `flowchart-studio`

1. SamCart → notify Make on purchase (Order / Product Purchased) for product slug `flowchart-studio`.
2. Make HTTP module:
   - Method: `POST`
   - URL: `https://flowchart.sopmojo.com/api/webhooks/entitlements`
   - Header: `Authorization: Bearer <ENTITLEMENT_WEBHOOK_SECRET>`
   - Header: `Content-Type: application/json`
   - Body:

```json
{
  "email": "{{customer email from the SamCart module}}",
  "product": "flowchart_plus",
  "active": true
}
```

3. Refund / cancel scenario for the same product: same request with `"active": false`.

### 2. Builder Pro — product slug `builder-pro`

Same HTTP module and secret. Body:

```json
{
  "email": "{{customer email from the SamCart module}}",
  "product": "builder_pro",
  "active": true
}
```

SamCart checkout: `https://rpease1.mysamcart.com/checkout/builder-pro#samcart-slide-open-left`.

Subscription cancelled / refunded: `"active": false` so `builder_pro` clears. That does not clear `flowchart_plus` if they also bought the $19 product.

### 3. Optional: Make creates the user

If you already create the Supabase Auth user in Make, do that **before** this HTTP module, on the same project (`NEXT_PUBLIC_SUPABASE_URL`), using the purchase email. Do not create a second auth system. Studio will match that user. If you skip this, Studio creates a confirmed user with a discarded random password and the buyer must use Builder’s existing password recovery before they can sign in.

## Vercel env (Root Directory `flowchart-studio`)

| Name | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes, for real unlocks | Shared Builder project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes, for real unlocks | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes, for the webhook | Server-only. Never `NEXT_PUBLIC_` |
| `ENTITLEMENT_WEBHOOK_SECRET` | Yes, for the webhook | Long random secret. Make sends it as a bearer token |
| `FLOWCHART_QA_UNLOCK` | No | Leave unset in production |
| `NEXT_PUBLIC_FLOWCHART_CHECKOUT_URL` | No | Defaults to the flowchart-studio checkout |
| `NEXT_PUBLIC_BUILDER_CHECKOUT_URL` | No | Defaults to the builder-pro checkout, hash included. Quote the value |
| `NEXT_PUBLIC_BUILDER_ORIGIN` | No | Defaults to `https://builder.sopmojo.com` |

Apply the SQL migration before expecting purchases to unlock.

## Gaps

- Builder’s own `/api/studio/*` still needs the AppGate to reject callers who are not `builder_pro`. Studio’s proxy is the gate for the Studio UI. A modified client can still call `builder.sopmojo.com` directly until that PR lands.
- Print and PNG generation stay in the browser. Each click re-checks `GET /api/entitlements`. A patched client can still render a PDF locally. The handoff POST and the attach proxy cannot.
- Studio does not email a set-password link. New purchase emails need Builder’s existing recovery, or Make should invite/create the user first.
- Refunds stay entitled until Make sends `active: false`.
- The service role key must be the Builder project key. The Client Systems project is unrelated.
- Large attach PDFs are proxied through the Studio function. If a map exceeds the platform body limit, attach will fail even when `builder_pro` is true. The wizard UX is unchanged.
