# Dromo API

AI resume-tailoring backend. Express + Sequelize + Postgres + Redis. Full design: `../docs/api-spec.md`.

## Status
- ✅ **Foundation**: config, 14 Sequelize models + associations, initial migration, curated
  `model_pricing` seeder, error/validation middleware, runnable Express app with health checks.
- ✅ **Auth** (`/auth`): email+password (bcrypt), passwordless magic link (Resend, single-use/15-min),
  JWT in httpOnly cookies with refresh-token rotation, Passport OAuth (Google/GitHub/LinkedIn,
  conditionally registered), the 100-credit signup grant, `requireAuth` + `requirePlan` middleware.
- ✅ **Credit engine + OpenRouter**: OpenRouter client (chat + `/models`), live pricing refresh into
  `model_pricing` (runs on boot), the transactional charge path (`chargeAndRun`: pre-flight → run →
  charge actual tokens → usage event + ledger + balance, atomic), credit config (markup, floors, plan
  gating, QA/retry/concurrent limits). Endpoints: `GET /models`, `GET /billing/balance`,
  `GET /billing/transactions`.
- ✅ **Sessions + generation**: `/sessions` CRUD (+ archive, model/template switch), and
  `tailor` / `cover-letter` / `chat` / `interview-brief` — each calls OpenRouter with a purpose-built
  prompt, charges via the credit engine, persists the artifact, and enforces model+template gating,
  retry caps, Q&A caps, and the free 3-concurrent-session cap. Master-resume CRUD (`/resume/master`).
- ✅ **Resume upload + parse**: `POST /resume/master` (multer) → text extraction (pdf-parse / mammoth)
  → AI parse to master JSON (charged via the credit engine) → optional Cloudinary storage → persist.
  Verified on a real 4-page PDF (name, 22 skills, 8 roles, 6 projects, 4 education, 3 certs).
- ✅ **Frontend wired to the live API** (cookie sessions, `credentials:'include'`).
- ✅ **Billing checkout + webhooks**: `POST /billing/checkout` (Stripe card / Dubu Pay), raw-body
  signature-verified `POST /webhooks/stripe` + `/webhooks/dubu`, and an idempotent `grantForPayment`
  (subscription → plan + monthly credits; top-up → credits; cancel → downgrade, keep credits). Needs
  `STRIPE_SECRET_KEY` / `DUBU_API_*` to go live (graceful 503 otherwise).
- ✅ **Files (Puppeteer)**: `GET /files/:kind/:sessionId?format=` — template-aware server-rendered PDF +
  DOCX/TXT/MD for resume / cover-letter / interview-brief. Verified (valid PDF/DOCX bytes).
- ⏳ Optional: point the frontend download buttons at `/files` (currently client-side export, which
  also works); scheduled jobs (pricing refresh cron, subscription renewal safety net).

## Setup
```bash
npm install
cp .env.example .env          # fill DATABASE_URL, REDIS_URL, secrets
createdb dromo                # or point DATABASE_URL at an existing PG
npm run db:migrate            # create all tables
npm run db:seed               # load curated model_pricing
npm run dev                   # http://localhost:4000/api/v1/health
```

## Scripts
- `npm run dev` — watch mode (tsx, resolves `@/` aliases)
- `npm run build` — `tsc` + `tsc-alias` → `dist/`
- `npm run db:migrate` / `db:migrate:undo` / `db:seed` / `db:seed:undo`
- `npm run typecheck` / `npm run lint`

## Notes
- **Path alias** `@/*` → `src/*` (tsconfig). Dev via tsx; prod build rewritten by tsc-alias.
- **DECIMAL columns** (`inputPrice`, `outputPrice`, `amountUsd`, `rawCostUsd`) come back as **strings**
  from Postgres — wrap with `Number()` in services (the credit engine does this).
- **Webhooks** (Stripe/Dubu) must be mounted with `express.raw()` *before* the JSON parser for
  signature verification — see `src/app.ts` note.
- Migrations/seeders are `.cjs` (run directly by sequelize-cli); app code is TS.

## Layout
```
src/
  config/     env, database, redis, logger, sequelize-cli.cjs
  models/     14 models + index (associations)
  migrations/ 20260620000000-init.cjs
  seeders/    20260620000100-model-pricing.cjs
  middleware/ error, validate
  routes/     index (health; feature modules mount here)
  utils/      app-error
  types.ts    shared domain types (resume JSONB shapes, enums)
  app.ts server.ts
```
