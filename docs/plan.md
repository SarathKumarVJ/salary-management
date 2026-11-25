# Delivery Plan

Plan drafted after reviewing the assessment brief and the initial scaffold
(commits `ca90e72`, `57abd66`, `85bfa3a`). Each slice is one reviewable step
and, ideally, one commit. TDD throughout.

## 1. Brief vs. current state

| Brief asks for | State at planning time |
|---|---|
| One-page requirements doc *before* building (goal, scope, features, **what's left out and why**) | `docs/requirements.md` is v0; needs an explicit "Out of scope + reasoning" section |
| Backend in the role's stack, any relational DB | Rails 8.1 API + MySQL 8 |
| React UI + a component library | React 19 + Vite + TS scaffolded; component library not chosen |
| Seed script with 10,000 employees | Not started |
| Deployed software + video demo | Not started — biggest schedule risk |
| Fast, deterministic unit tests | RSpec installed; frontend test harness not wired |
| Incremental commits | On track |
| Artifacts: prompts, trade-offs, performance notes, diagrams | Folders exist, empty |

## 2. Scaffold review findings

**Breaking**
1. Default shell Node is 18; Vite 8 needs ≥ 20.19, so `npm run build` fails. `.nvmrc` says 24 (installed via nvm) — make it the default.
2. CI workflow lives at `backend/.github/workflows/ci.yml`; GitHub only reads the repo-root `.github/`. It also has no RSpec job and no frontend job.
3. Production `database.yml` is a placeholder; deploy needs `DATABASE_URL`.

**Should fix**
4. RuboCop: 10 offences in `Gemfile` (array bracket spacing from `bundle add`), all safe-autocorrectable.
5. CORS initializer still commented out although `rack-cors` is installed.
6. FactoryBot / shoulda-matchers not configured in `spec/rails_helper.rb`; no `spec/support/`.
7. Frontend has no `test` script, Vitest config, setup file, or Vite dev proxy.
8. Unneeded frameworks loaded for an API (ActionMailbox, ActionText, ActionCable, ActiveStorage, `image_processing`).
9. Doc drift: ~~`frontend/CLAUDE.md` says React 18 (19 installed)~~; seed name files referenced but absent (slice 5); ~~`dotenv-rails` not in `bootstrap.sh`~~.
10. `App.tsx` is still the Vite demo page.

## 3. Decisions

| Decision | Recommendation | Status |
|---|---|---|
| Currency | Store `salary` (decimal) + `currency` per employee. Per-country stats in local currency; cross-country view normalised to USD via a small static FX table (limitation documented). | Awaiting recruiter |
| Deploy with MySQL | Free tiers rarely offer MySQL (Render free is Postgres-only and expires after 30 days). Railway (app + MySQL), or Render/Fly + Aiven / TiDB Serverless free MySQL. Spike early. | Awaiting recruiter |
| Auth | Out of scope (single HR persona); documented in requirements. | Awaiting recruiter |
| Component library | MUI — data grid + form controls out of the box; lowest-risk path. | Proposed |
| Product extras | CSV export of filtered list (HR is migrating off Excel). CSV import listed as deliberately left out. | Proposed |

## 4. Slices and estimates

| # | Slice | Contents | Est. |
|---|---|---|---|
| 0 | Hygiene | Node 24; root CI with rspec + frontend jobs; rubocop; CORS; RSpec support; trim frameworks; Vitest + RTL + dev proxy; doc drift | 1.5h |
| 1 | Requirements v1 + design | One-page requirements (goal, scope, out-of-scope + why, assumptions); architecture diagram; deploy spike | 2h |
| 2 | Employee model | Migration (decimal salary, currency, indexes incl. composite country+job_title), validations, factory, model specs | 1.5h |
| 3 | CRUD API | `/api/v1/employees`; 201/204/404/422; `{ errors: [] }` shape; request specs | 2h |
| 4 | Search query | `Employees::SearchQuery`: name search, filters, allow-listed sort, pagy pagination, filter-options endpoint | 2h |
| 5 | Seeds | Name text files, seeded RNG (deterministic), 10k rows via `insert_all` in batches of 1,000; timing recorded | 1h |
| 6 | Insights | `Insights::SalaryStats`: min/avg/median/max + headcount by country and job title (median via MySQL 8 window functions), optional department/level, USD view; `EXPLAIN` check | 3h |
| 7 | Frontend foundation | MUI, router, layout, API client, types, QueryClient | 2h |
| 8 | Employee list | MSW API mocks; server-side table, search, filters, pagination, loading/empty/error states, tests | 2.5h |
| 9 | Employee form | Create / edit / delete, inline API validation errors, tests | 2.5h |
| 10 | Insights page | Summary cards, tables, one chart, tests | 3h |
| 11 | Deploy | Production config, env vars, prod seed, smoke test | 2–3h |
| 12 | Submission | README (setup, decisions, trade-offs, performance), AI prompt log, demo video | 2h |
| | **Total** | | **≈ 27–28h (~3.5 focused days, 4 with buffer)** |

## 5. Risks and cut order

- **Critical path:** deploy (slices 1, 11), median + currency correctness (6), frontend velocity (8–10).
- **Cut first if time is short:** department/level insights, then the chart. Tests and docs are not cut.
