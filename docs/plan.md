# Delivery Plan

Plan drafted after reviewing the assessment brief and the initial scaffold
(commits `88ddf83`, `90855d2`, `1136b21`). Each slice is one reviewable step
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

**Status at submission:** slices 0–13 and the slice 14 docs are done; the demo video is recorded last. The app is
deployed (Railway + Aiven MySQL), seeded with 10,000 employees, covered by RSpec and Vitest in CI, and documented in
the README, `docs/design.md` and `docs/ai-prompts/`. The table above is kept as it was at the start, for history.

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

| Decision | Choice | Status |
|---|---|---|
| Currency | Store `salary` (decimal) in local currency; `currency` derived from country. Per-country stats in local currency; cross-country view normalised to USD via static, dated rates. | Built as assumed (no reply from the recruiter yet) |
| Auth | Sign-in for the HR Manager persona: `has_secure_password`, revocable session tokens (bearer), single `hr_manager` role enforced in one `before_action`. | **Decided (owner)**, built (slices 3, 8) |
| Deploy | **Local first**: the full system runs end to end locally before any hosting work. Then Railway (API + static SPA) with Aiven free MySQL (Railway's trial credit didn't cover a database); config is env-only so the host can change. | **Done** (slice 13) |
| Component library | MUI — data grid + form controls out of the box; lowest-risk path. | **Decided** (slice 8) |
| Product extras | CSV export of filtered list (HR is migrating off Excel). CSV import listed as deliberately left out. | **Done** (slices 5, 9) |

## 4. Slices and estimates

| # | Slice | Contents | Est. |
|---|---|---|---|
| 0 | Hygiene ✅ | Node 24; root CI with rspec + frontend jobs; rubocop; CORS; RSpec support; trim frameworks; Vitest + RTL + dev proxy; doc drift | 1.5h |
| 1 | Requirements v1 + design ✅ | One-page requirements (goal, scope, out-of-scope + why, assumptions); architecture + auth diagrams; data model; API surface | 1.5h |
| 2 | Employee model ✅ | Migration (decimal salary, currency from country, indexes incl. composite country+job_title), validations, factory, model specs | 1.5h |
| 3 | Auth API ✅ | `User` (`has_secure_password`, `role` enum) + `Session` (token, expiry); `POST/GET/DELETE /api/v1/session`; `authenticate!` (401) in the API base controller; request specs | 2.5h |
| 4 | Employee CRUD API ✅ | `/api/v1/employees` behind auth + `require_hr_manager!` (403; first consumer of the role check); 201/204/404/422; `{ errors: {} }` shape; `RecordNotUnique` (concurrent duplicate email) → 422; request specs | 2h |
| 5 | Search query ✅ | `GET /employees` (index) via `Employees::SearchQuery`: name search, filters, allow-listed sort, pagy pagination, filter-options endpoint (incl. supported countries + levels), CSV export | 2.5h |
| 6 | Seeds ✅ | Name text files, seeded RNG (deterministic), 10k rows via `insert_all` in batches of 1,000; currency set explicitly (callbacks skipped) + spec that it matches country; HR Manager user from env; timing recorded | 1h |
| 7 | Insights ✅ | `GET /insights?group=` via `Insights::SalaryStats`: min/avg/median/max + headcount by country, job title and department (median via MySQL 8 window functions), USD view; `EXPLAIN` check | 3h |
| 8 | Frontend foundation + sign-in ✅ | MUI, router, layout, API client (bearer token, 401 → sign-in), sign-in page, protected routes, QueryClient, MSW test setup | 3.5h |
| 9 | Employee list ✅ | Server-side table, search, filters, pagination, CSV download, loading/empty/error states (incl. 403 for a user without the role), tests | 2.5h |
| 10 | Employee form ✅ | Create / edit / delete, inline API validation errors, tests | 2.5h |
| 11 | Insights page ✅ | Grouped stats table (country / job title / department, country filter), headcount summary line (instead of cards, which would repeat the table), one chart without a library, tests | 3h |
| 12 | Local end-to-end ✅ | Fresh clone → `bin/setup`, seed, sign in, every flow by hand; fix gaps; README setup verified | 0.5h |
| 13 | Deploy ✅ | Railway (API + SPA) + Aiven MySQL: env vars, prod seed, smoke test | 2–3h |
| 14 | Submission (docs ✅, video pending) | README (setup, decisions, trade-offs, performance), AI prompt log, demo video | 2h |
| | **Total** | | **≈ 31–32h (~4 focused days, 4.5 with buffer)** |

## 5. Risks and cut order

- **Critical path:** auth wiring across SPA + API (3, 8), median + currency correctness (7), frontend velocity (9–11), deploy (13, now deliberately last).
- **Deploy risk:** moved to the end by choice (local first). Mitigation: config is env-only and the Dockerfile already builds; keep slice 13 time-boxed.
- **Cut first if time is short:** the chart, then CSV export. Auth, tests and docs are not cut.
