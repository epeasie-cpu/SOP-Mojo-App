# Flowchart Studio

Canonical host: **https://flowchart.sopmojo.com**

**Flowchart Studio** is a SOP Mojo product: a low-friction AI flowchart tool in the Builder Pro theme (dark zinc + lime `#B0FF56`). Photograph a handwritten scribble, talk the process through, or paste text. Edit the graph on a live canvas. Chat applies modular edits to the same JSON. Create and iterate stay free. Print / export / Export to Builder Pro come with **Builder Pro $39/mo** (optional $19 unlock is a secondary stub).

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
| `NEXT_PUBLIC_FLOWCHART_CHECKOUT_URL` | No | Flowchart+ / optional $19 SamCart Slide Checkout. Defaults to `https://rpease1.mysamcart.com/checkout/flowchart-studio` |
| `NEXT_PUBLIC_BUILDER_CHECKOUT_URL` | No | Primary CTA. Defaults to `https://rpease1.mysamcart.com/checkout/sop-builder-pro` |
| `NEXT_PUBLIC_SUPABASE_URL` | For sign-in | Builder Pro Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For sign-in | Builder Pro anon key (browser sign-in) |
| `SUPABASE_URL` | For library | Same project URL if you prefer a server-only name |
| `SUPABASE_ANON_KEY` | For library | Same anon key, used to verify access tokens |
| `SUPABASE_SERVICE_ROLE_KEY` | Production library | Writes `flowchart_maps`. Required in production |
| `BUILDER_ORIGIN` | No | Attach proxy target. Defaults to `https://builder.sopmojo.com` |

Never hardcode API keys. Unlock state is a `localStorage` flag (`flowchart-studio-unlocked`). Append `?unlock=1` or `?unlock=builder-pro` to mark this browser unlocked. Export and library save also require the shared Builder account.

Copy: **Unlock with Builder Pro · $39/mo** (optional $19 unlock is secondary)

## Vercel

Create a Vercel project with **Root Directory** = `flowchart-studio`. Framework preset: Next.js. Attach the env vars above. Intended production host: `flowchart.sopmojo.com`. Apply `supabase/0001_flowchart_maps.sql` on the Builder Supabase project before production library saves.

## Builder bridge

**Export to Builder Pro** (gated) asks you to sign in, saves the canvas on that user (`/api/library`), then opens a wizard: pick an SOP, then a step or **Its Own Step**. Studio posts `sopId`, `placement` (`own-step` or `existing-step`), `flowchartId`, and the print PDF to Builder's attach API. The PDF uses the same letter-landscape, edge-arrow, dense-box pipeline as Print.

Builder lists this user's maps with `GET /api/library` and the same bearer token. The exact contract is in [`BUILDER_BRIDGE.md`](./BUILDER_BRIDGE.md).

The old `?import=flowchart&flowchartJson=…` auto-spawn link is deprecated and is not the export button.

## Stack

Next.js App Router, TypeScript, Tailwind CSS, React Flow (`@xyflow/react`).
