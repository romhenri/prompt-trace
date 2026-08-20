# Prompt Forge

Two small tools for working with LLM prompts:

- **`/generate`** — describe a task, get back a structured, production-ready prompt.
- **`/compare`** — run one prompt across 2 to 6 models at once, streaming side by side.

## No backend

Next.js is used purely as a static site generator (`output: 'export'`). There is
no server of ours at runtime: no API routes, no server actions, no middleware, no
database, no accounts, no telemetry. `pnpm build` emits `out/`, which any static
host will serve.

The only host the app ever contacts is `https://openrouter.ai`.

## Your key

Model calls are billed to your own [OpenRouter](https://openrouter.ai/keys) key,
which is stored in your browser's `localStorage` under `pf:openrouter_key` and is
sent to openrouter.ai and nowhere else.

## Commands

```bash
pnpm install
pnpm dev                  # http://localhost:3000
pnpm build && npx serve out   # the real static output
pnpm lint && pnpm typecheck && pnpm test
```
