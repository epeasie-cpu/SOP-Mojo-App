# Flowchart Studio

Canonical host: **https://flowchart.sopmojo.com**

**Flowchart Studio** is a SOP Mojo product: a low-friction AI flowchart tool in the Builder Pro theme (dark zinc + lime `#B0FF56`). Photograph a handwritten scribble, talk the process through, or paste text. Edit the graph on a live canvas. Chat applies modular edits to the same JSON. Create and iterate stay free. **Flowchart Plus ($19 one-time)** unlocks print and PNG/JSON export. **Builder Pro ($39/mo)** includes those and Export to Builder Pro. Flowchart Plus does not unlock Export to Builder.

This app lives in `/flowchart-studio` so the Streamlit AUP Engine at the repository root, AI SOP Writer, and Client Systems stay untouched.

## Product name

Use **Flowchart Studio** in the UI.

Parent: https://www.sopmojo.com  
Living system: https://builder.sopmojo.com  
Founder contact: ryan@sopmojo.com

## Local development

```bash
cd flowchart-studio
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

Without `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`, text and voice still map through the local template engine (**template mode**). Photo (handwriting) needs a vision-capable key. Chat still understands delete / rename / add / yes-no branch / rewrite from labels.

```bash
npm run build
npm start
npm test
npm run lint
```

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | No | Text, chat, and photo vision (OpenAI first) |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |
| `ANTHROPIC_API_KEY` | No | Used when OpenAI is not set |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-3-5-haiku-latest` (vision: `claude-sonnet-4-5`) |
| `NEXT_PUBLIC_FLOWCHART_CHECKOUT_URL` | No | Flowchart Plus $19 SamCart checkout. Defaults to `https://rpease1.mysamcart.com/checkout/flowchart-studio` |
| `NEXT_PUBLIC_BUILDER_CHECKOUT_URL` | No | Builder Pro $39/mo checkout. Defaults to `https://rpease1.mysamcart.com/checkout/builder-pro#samcart-slide-open-left` |
| `NEXT_PUBLIC_SUPABASE_URL` | For sign-in, map save, and entitlement reads | Builder Pro Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For sign-in, map save, and entitlement reads | Anon key. User writes use the user access token |
| `SUPABASE_SERVICE_ROLE_KEY` | For the entitlement webhook | Server-only. Match/create users and upsert `public.entitlements` |
| `ENTITLEMENT_WEBHOOK_SECRET` | For the entitlement webhook | Shared secret. `MAKE_WEBHOOK_SECRET` is an accepted alias |
| `FLOWCHART_QA_UNLOCK` | No | Set to `1` only for Ryan QA. Off in production. See below |
| `NEXT_PUBLIC_BUILDER_ORIGIN` | No | Builder origin for the Studio `/api/studio/*` proxy. Defaults to `https://builder.sopmojo.com` |
| `MAILCHIMP_API_KEY` | No | Server-only. Tags `flowchart` after “Sign in to keep this map”. Sign-in still works if this is missing or Mailchimp errors. |
| `MAILCHIMP_AUDIENCE_ID` | No | Defaults to `7c2226f741` (Mojo Business Solutions LLC). |

Create and iterate stay free. When a map exists only in this browser, a dismissible bar says **Sign in to keep this map** (`Not now` hides it for the tab). Signing in there uses the existing Builder Supabase account, saves the map with the current library upsert, and calls `POST /api/capture` to tag `flowchart`. Print, export, and Export to Builder stay on the Flowchart Plus / Builder Pro entitlement check. Creating an account does not unlock them.

Never hardcode API keys. Print, export, and Export to Builder read `public.entitlements` (`flowchart_plus`, `builder_pro`) after sign-in. The old `flowchart-studio-unlocked` localStorage flag is not a gate and is cleared on load. Full schema, Make/SamCart steps, and the QA bypass are in [`ENTITLEMENTS.md`](./ENTITLEMENTS.md).

Apply Builder's `database/migrations/20260924_flowchart_library_and_placement.sql` and Studio's `supabase/migrations/20260925_entitlements.sql` on that shared Supabase project before saves and unlocks.

**QA only:** set `FLOWCHART_QA_UNLOCK=1` on the server (not `NEXT_PUBLIC_`). Then `?unlock=1` unlocks print and export, and `?unlock=builder-pro` also unlocks Export to Builder. Leave it unset on Vercel production.

## Vercel

Create a Vercel project with **Root Directory** = `flowchart-studio`. Framework preset: Next.js. Attach the env vars above. Intended production host: `flowchart.sopmojo.com`.

## Builder bridge

**Export to Builder Pro** (Builder Pro only) asks you to sign in, upserts the canvas into `public.flowchart_maps` with that user's Supabase token, then opens a wizard: pick an SOP, then a step or **Its Own Step**. The browser calls Studio `/api/studio/*`, which checks `builder_pro` and forwards to `https://builder.sopmojo.com/api/studio/attach` with `target` `"own"` or a step id, `placement` `own` or `step`, the flowchart id, and a PDF from the print pipeline. Builder returns `stepId`, `placement`, `pdfUrl`, and a printable payload.

The old `?import=flowchart&flowchartJson=…` auto-spawn link is deprecated and is not the export button. The contract is in [`BUILDER_BRIDGE.md`](./BUILDER_BRIDGE.md).

## Stack

Next.js App Router, TypeScript, Tailwind CSS, React Flow (`@xyflow/react`).
