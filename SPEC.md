# Prompt Forge — Build Spec (MVP)

> Paste this file into your repo as `SPEC.md`, then tell Claude Code:
> "Read SPEC.md and implement it. Start with a plan and ask me about anything ambiguous before writing code."

---

## 1. What we're building

**Prompt Forge** is a web app that bundles small tools for working with LLM prompts. All model calls go through **OpenRouter**, using an **API key that the user provides** — we never ship or store a key of our own.

The MVP has exactly **two tools**:

1. **Prompt Generator** — user describes what they want; the app writes a well-structured prompt for them.
2. **Prompt Comparison** — user writes one prompt, picks N models, and sees every model's answer side by side.

Anything not listed in this spec is out of scope. Do not add extra tools, auth, billing, or a database.

---

## 2. Hard constraint: NO BACKEND

We use Next.js, but **only as a static site generator**. There is no server of ours at runtime, at any point, for any reason.

- `next.config.ts` sets **`output: 'export'`**. The build produces plain static files in `out/` that can be served from any dumb static host.
- **Forbidden:** `app/api/**` route handlers, server actions (`'use server'`), middleware, `next/headers`, `cookies()`, ISR/`revalidate`, `next/image` with the default loader (use `unoptimized: true`), and any dynamic server rendering. If it doesn't survive `output: 'export'`, it doesn't go in.
- **No** database, no user accounts, no server-side session, no telemetry endpoint, no serverless proxy.
- The **only** network destination in the entire app is `https://openrouter.ai`. If a task seems to need a server, it is out of scope — say so instead of building one.
- `pnpm build` must succeed with **zero environment variables**, and `npx serve out` must give a fully working app.

The tool pages are client components (`'use client'`). Server components are fine only for static shell/layout that touches no request-time data.

---

## 3. Stack

- **Next.js (App Router) + React + TypeScript** (strict mode), static export.
- **Tailwind CSS + shadcn/ui**, **lucide-react** for icons.
- State: React state + a tiny store (`zustand`) + `localStorage`. Nothing else.
- Streaming via `fetch` + `ReadableStream` (manual SSE parsing), `AbortController` for cancel.
- ESLint + Prettier clean, `pnpm` as package manager.
- Deploy target: any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages). Set `trailingSlash: true` so deep links resolve to `out/compare/index.html` everywhere.

---

## 4. API key handling

- First visit shows an onboarding screen explaining that a personal OpenRouter key is required, with a link to `https://openrouter.ai/keys`.
- Key is stored in `localStorage` under `pf:openrouter_key`.
- Validate on save: `GET https://openrouter.ai/api/v1/key` with `Authorization: Bearer <key>`. Show the key label / credit info returned, or a clear error if invalid.
- Settings modal (gear icon in header) lets the user view a masked key (`sk-or-v1-••••abcd`), replace it, or delete it.
- The key lives in the browser and goes nowhere except `openrouter.ai`. Never log it, never put it in a URL, never send it to any other host.
- Make this explicit in the UI: a short line on the onboarding screen saying the key stays in this browser and the app has no server.
- Show a persistent banner when no key is set, with a button to open Settings.
- Guard every `localStorage` access — it runs during export/prerender too, so read it inside `useEffect`, never at module scope.

Required OpenRouter headers on every call:

```
Authorization: Bearer <key>
HTTP-Referer: <window.location.origin>
X-Title: Prompt Forge
Content-Type: application/json
```

---

## 5. Model catalog (shared)

- Fetch `GET https://openrouter.ai/api/v1/models` **client-side on mount**, cache in memory + `localStorage` with a 24h TTL, plus a manual "refresh models" action. Never fetch it at build time — the catalog would go stale in the bundle.
- Build a reusable `<ModelPicker />` component with:
  - text search over id and name;
  - filter by provider (derived from the `id` prefix, e.g. `anthropic/`, `openai/`, `google/`);
  - display of context length and prompt/completion price per 1M tokens;
  - single-select and multi-select modes (same component, prop-driven);
  - "favorites" starred by the user, persisted in `localStorage`, pinned to the top;
  - graceful handling of a model that no longer exists in the catalog.
- Ship a small default favorites list on first run (a fast cheap model, a strong reasoning model, and a mid-tier one), but never hardcode it as the only option.

---

## 6. Tool 1 — Prompt Generator

**Route:** `/generate`

**Inputs:**
- `task` (required, textarea): what the user wants the prompt to accomplish.
- `context` (optional textarea): domain, audience, background.
- `outputFormat` (optional): free text or preset chips (JSON, markdown, bullet list, code, prose).
- `constraints` (optional): tone, length, things to avoid.
- `promptStyle` (select): `system prompt` | `user prompt` | `agent instructions`.
- `targetModel` (optional, single-select from ModelPicker): the model the generated prompt is *meant for*; mention it in the meta-prompt so the output is tuned to it.
- `generatorModel` (single-select): the model that *writes* the prompt. Defaults to a strong instruction-following model.

**Behavior:**
- A meta-prompt (kept in `lib/meta-prompts/generator.ts`, exported as a template function — easy to iterate on) instructs the generator model to return a production-ready prompt.
- The generated prompt must be structured: role/objective, context, step-by-step instructions, constraints, output format, and 1–2 few-shot examples when they help. It must be returned as **raw text inside a single fenced block**, with no commentary outside it, so we can extract it reliably.
- Stream the output token by token into a result panel.
- Result panel actions: **Copy**, **Edit** (becomes an editable textarea), **Regenerate**, and **Send to Comparison** (hands the prompt over through the store, not a query string).
- Save each generation to history (see §8).

---

## 7. Tool 2 — Prompt Comparison

**Route:** `/compare`

**Inputs:**
- `systemPrompt` (optional textarea, collapsible).
- `userPrompt` (required textarea).
- `models`: multi-select, **2 to 6** models.
- Advanced (collapsible): `temperature` (default 1), `max_tokens` (default empty = provider default). Same params applied to every model so the comparison is fair.

**Behavior:**
- "Run" fires all requests **in parallel from the browser**, each streaming independently.
- Layout: horizontally scrollable columns on desktop (min-width ~340px each), stacked cards on mobile. Each column header shows the model name, a status dot (queued / streaming / done / error / cancelled), and a per-column menu.
- Per-column footer metrics once finished:
  - **Latency** — time to first token and total wall time (measured client-side).
  - **Tokens** — prompt/completion, from the `usage` object (request with `stream_options: { include_usage: true }`).
  - **Cost** — computed from usage × the model's catalog price; label it "estimated".
- Per-column actions: **Copy**, **Rerun this model**, **Cancel** (AbortController), **Expand** (full-width modal).
- Global actions: **Cancel all**, **Rerun all**, **Export** as Markdown (prompt + each model's output + metrics) and as JSON — generated in-browser via a Blob download.
- One model failing must never break the others — render the error inside that column with the OpenRouter message and a retry button. Handle 401 (bad key), 402 (no credits), 429 (rate limit) with human-readable copy.
- Optional toggle: **Sync scroll** across columns.
- Save each run to history (see §8).

---

## 8. History (shared, minimal)

- `localStorage` key `pf:history`, capped at the 50 most recent entries.
- Entry: `{ id, tool: 'generate' | 'compare', createdAt, inputs, outputs, models, metrics }`.
- A `/history` page lists entries with a one-line preview; clicking one restores it into the relevant tool. Individual delete + "clear all".
- Guard against quota errors: if `localStorage` is full, drop the oldest entries and warn once.

---

## 9. Design direction

- Dark-first, developer-tool aesthetic: dense but not cramped, mono font for prompt/response text, sans for UI chrome.
- Content-first — no marketing hero on the tool pages. `/` is a slim landing page with two big cards linking to the tools, plus the key setup state.
- Skeleton loaders, not spinners. Streaming text should render smoothly without layout jumps.
- Fully keyboard accessible; `Cmd/Ctrl+Enter` submits in both tools.
- Responsive down to 375px.

---

## 10. Suggested structure

```
next.config.ts             # output: 'export', trailingSlash: true, images.unoptimized
app/
  layout.tsx
  page.tsx                 # landing
  generate/page.tsx
  compare/page.tsx
  history/page.tsx
components/
  model-picker.tsx
  key-settings-dialog.tsx
  prompt-textarea.tsx
  response-column.tsx
lib/
  openrouter/client.ts     # chat completions + SSE streaming
  openrouter/models.ts     # catalog fetch + cache
  openrouter/types.ts
  meta-prompts/generator.ts
  storage.ts               # typed localStorage helpers
  cost.ts
  history.ts
store/
  app-store.ts
```

---

## 11. Acceptance criteria

- [ ] `pnpm build` emits `out/` and `npx serve out` runs the whole app with no server process of ours and no env vars.
- [ ] There is no `app/api` directory, no `'use server'`, and no middleware anywhere in the repo.
- [ ] A grep for `fetch(` finds no host other than `openrouter.ai`.
- [ ] Deep-linking to `/compare` and hard-refreshing works on a plain static host.
- [ ] With no key set, both tools are blocked with a clear call to action; with an invalid key, the error names the problem.
- [ ] `/generate` produces a structured prompt, streams it, and "Send to Comparison" carries it over intact.
- [ ] `/compare` runs 4 different models at once, all streaming simultaneously, and shows latency + token + estimated cost for each.
- [ ] Killing one model's request leaves the others untouched.
- [ ] No hydration mismatch warnings in the console on first load.
- [ ] `pnpm lint` and `tsc --noEmit` pass clean.
- [ ] Works on a 375px viewport.

---

## 12. Build order

1. Scaffold Next.js with `output: 'export'`, Tailwind, shadcn/ui, layout shell, header. Verify the static export works before writing any feature.
2. Key storage + validation + settings dialog + onboarding.
3. Model catalog fetch, cache, and `<ModelPicker />`.
4. OpenRouter client with SSE streaming, cancel, and typed errors.
5. Comparison tool (harder, and it exercises the whole client).
6. Generator tool + meta-prompt.
7. History.
8. Polish: empty states, errors, mobile, keyboard, export.

Commit at the end of each step with a clear message. After steps 4, 5 and 6, stop and tell me what to test manually before continuing.

---