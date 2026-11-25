# Design & Trade-offs

## Architecture

```mermaid
flowchart LR
  HR["HR Manager<br/>(browser)"] --> SPA["React SPA<br/>Vite · TS · MUI<br/>TanStack Query"]
  SPA -- "JSON over HTTPS<br/>/api/v1/*" --> API["Rails 8.1 API<br/>controllers → queries/services"]
  API -- "ActiveRecord + SQL aggregates" --> DB[("MySQL 8<br/>employees")]
  Seed["db/seeds.rb<br/>10k rows via insert_all"] --> DB
```

- **SPA:** owns UI state only. Server state (lists, insights) lives in TanStack Query, keyed by every filter.
- **API:** thin controllers. Filtering is `Employees::SearchQuery`, aggregates are `Insights::SalaryStats`.
- **Dev:** Vite proxies `/api` to Rails, so dev is same-origin. **Prod:** two origins, with CORS limited to an allow-list.

## Data model

`employees`

| Column | Type | Notes |
|---|---|---|
| `full_name` | string, not null, ≤ 255 | prefix search; indexed |
| `email` | string, not null | **unique index**; format validated |
| `job_title` | string, not null | indexed |
| `department` | string, not null | indexed |
| `level` | string(2), not null | one of L1–L6 (fixed list, `Employee::LEVELS`); not indexed: no level filter in scope |
| `country` | string(2), not null | ISO 3166 code from the supported list: AU, CA, DE, FR, GB, IN, SG, US |
| `currency` | string(3), not null | ISO 4217; **set from country**, not user input |
| `salary` | decimal(12,2), not null | annual gross, local currency; > 0 and < 10¹⁰ (column limit) |
| `hire_date` | date, not null | not in the future: compared with the UTC date + 1 day, so "today" works in every time zone without configuring one |

**Indexes:** `email` (unique; the case-insensitive collation also makes it case-insensitive), `full_name`, `department`, `job_title`, and
`[country, job_title]`, which serves both the country filter (its leftmost column) and the "job title within a country" question, so
`country` has no index of its own. Name search uses `LIKE 'term%'` on `full_name` / `email`, which can
use an index. A contains-search would need a full scan; at 10k rows that is still fast, so this is measured,
not guessed.

**Why currency is derived from the country:** this app allows exactly one currency per country. Letting HR
type both fields opens the door to "India / USD" rows that silently corrupt every per-country aggregate.

`users` / `sessions` (authentication)

| Table | Columns | Notes |
|---|---|---|
| `users` | `email` (unique), `password_digest`, `role` | `has_secure_password` (bcrypt). `role` is a Rails enum with one value today: `hr_manager`. `nil` means the account exists but has no access (403). |
| `sessions` | `user_id`, `token` (unique), `expires_at` | One row per sign-in, token from `has_secure_token`. Deleting the row signs out immediately. |

**Write paths that skip callbacks:** currency is set by a `before_validation` callback. `insert_all` (used by
the seeds) skips callbacks and validations, so the seeder sets `currency` from `Employee::CURRENCY_BY_COUNTRY.fetch(country)`
itself, and a spec checks that every seeded row's currency matches its country. No other code path uses `insert_all` or `update_column(s)`.

## Authentication & authorization

```mermaid
sequenceDiagram
  participant SPA
  participant API
  SPA->>API: POST /api/v1/session {email, password}
  API-->>SPA: 201 {token, user: {email, role}}
  SPA->>API: GET /api/v1/employees (Authorization: Bearer token)
  API-->>SPA: 200 (or 401 no/expired token, 403 not hr_manager)
  SPA->>API: DELETE /api/v1/session
  API-->>SPA: 204 (session row deleted)
```

- **Bearer token, not cookies:** in production the SPA and API run on different origins. A token in the
  `Authorization` header avoids `SameSite=None` cookies and CSRF handling.
- **Server-side session rows** (not a stateless signed token), so sign-out and expiry really revoke access.
  Tokens are 24-char base58 (`has_secure_token`), matched case-sensitively (`utf8mb4_bin` column).
  The sessions expire after 12 hours (expired at exactly 12h). Expired rows are not deleted (harmless at this
  scale; a periodic `delete_all` on expired rows is the later fix).
- **Authorization** is one `before_action` in `Api::V1::BaseController`: `authenticate!` (401) followed by `require_hr_manager!` (403, added in slice 4 with its first consumer, the employees endpoints).
  There's no policy gem, because one role doesn't justify one.
- **Brute force:** `rate_limit` on sign-in (10 attempts / 3 minutes per IP). It uses the cache store, which is per process, so it is fine for a single instance. Tests use the null store, so the limit isn't exercised in specs.
- **Passwords:** at least 12 characters.
- **Token storage in the SPA:** `localStorage`, so a page refresh keeps you signed in. The trade-off is XSS exposure.
  This is mitigated by React's escaping and by loading no third-party scripts. An httpOnly cookie on a shared domain would remove that risk, but it needs a custom domain.
- **Bootstrap user:** `db/seeds.rb` creates one HR Manager using `HR_MANAGER_EMAIL` / `HR_MANAGER_PASSWORD`, which come from env (with a dev-only default).

## API surface (`/api/v1`)

Everything except `POST /session` and `GET /up` requires `Authorization: Bearer <token>`. From slice 4, every endpoint except `/session` also requires the `hr_manager` role.

**Employee JSON** has explicit fields (no timestamps): `id, full_name, email, job_title, department, level, country, currency, salary, hire_date`. `salary` is a **decimal string with two places** (`"1500000.00"`), exact for money, unlike a JSON number. The SPA types it as `string`.

**Errors** use one shape everywhere: `{ "errors": { field: [msgs] } }`, with `base` for errors not tied to a field (401: `{ "errors": { "base": ["Not signed in"] } }`).

| Method & path | Purpose |
|---|---|
| `POST /session` · `DELETE /session` · `GET /session` | Sign in (201 with token; 401 with a generic message on bad credentials) · sign out (204) · current user |
| `GET /employees?q=&country=&department=&job_title=&sort=&dir=&page=&per_page=` | Paginated, filtered list. `sort` is checked against an allow-list. Pagination metadata is in the body. |
| `GET /employees.csv?…same filters` | CSV export of the filtered set |
| `GET /employees/:id` · `POST /employees` · `PATCH /employees/:id` · `DELETE /employees/:id` | CRUD (built in slice 4; the list `GET /employees` comes in slice 5 with pagination). Returns 201 / 200 / 204; 400 for a missing `employee` key or malformed JSON; 403 without the `hr_manager` role; 404 for an unknown id; 422 with `{ "errors": { field: [msg] } }` |
| `GET /filters` | Distinct departments and job titles in use, plus the **supported** countries and levels (from `Employee`), so the SPA never hard-codes those lists |
| `GET /insights/countries` | Per country: headcount, min / median / avg / max in local currency, and median in USD |
| `GET /insights/job_titles?country=` | Same stats per job title, optionally within one country |

## Key algorithms

- **Median in MySQL 8** (no `PERCENTILE_CONT`): number the rows within each group with
  `ROW_NUMBER() OVER (PARTITION BY grp ORDER BY salary)` and count them with `COUNT(*) OVER (PARTITION BY grp)`.
  Keep the row(s) at positions `FLOOR((n+1)/2)` and `CEIL((n+1)/2)`, then `AVG` them. This handles odd and even group
  sizes in one query. It is covered by specs for odd, even, single-row and empty groups.
- **USD normalisation:** a static `config/exchange_rates.yml` (rate per currency, with an "as of" date).
  Conversion happens on aggregated values (`median × rate`), so each currency is only aggregated with itself.

## Deployment (local first, then hosted)

The whole system has to work locally end to end (MySQL, Rails, Vite, seeded data, sign-in) before any
hosting work begins. Railway is the current choice. Nothing in the code is tied to it (config comes only from env), so switching later costs nothing.

| Option | Cost | Trade-off |
|---|---|---|
| **Railway** (API + MySQL + static SPA) | Trial / hobby credit | One platform, managed MySQL, least setup. **Recommended.** |
| Render (free web + static) + Aiven/TiDB free MySQL | $0 | Two providers; free web service sleeps, so the first request takes 30–50 s |
| Fly.io (existing Dockerfile) + Aiven/TiDB MySQL | ~$0 | Most hands-on |

Production needs `DATABASE_URL`, `RAILS_MASTER_KEY`, `CORS_ORIGINS` (the SPA's URL) and `HR_MANAGER_EMAIL` / `HR_MANAGER_PASSWORD` on the API, and `VITE_API_URL` at SPA build time.

## Decisions
| Decision | Choice | Why | Alternative |
|---|---|---|---|
| Repo layout | Monorepo | One review link, one CI, shared docs | Two repos |
| Backend | Rails API-only | Owner's core strength | Full-stack Rails + Hotwire |
| Frontend | React + Vite + TS | Role asks for React | Hotwire/Turbo |
| Auth | `has_secure_password` + session rows + bearer token; single `hr_manager` role checked in one `before_action` | Persona is an HR Manager; revocable sessions; works across origins | Devise (heavy for one role); JWT (no real sign-out); cookies (cross-origin pain) |
| UI kit | MUI | Data grid, form controls and accessibility out of the box | shadcn/ui (more assembly) |
| Insights | SQL aggregates + window-function median | Avoid loading 10k rows; exact median | Ruby enumerables; approximate percentiles |
| Currency | Local currency stored; derived from country; USD view via static dated rates | Correct per-country stats + comparable cross-country view; no external dependency | Store USD only (loses the real salary); live FX API |
| Pagination | Offset (pagy) | Simple, supports "page N of M"; fine at 10k rows | Keyset (faster at millions, no page numbers) |
| Seeding | `insert_all` batches, seeded RNG | Speed + deterministic data | `create!` loop |
| Dev API access | Vite proxies `/api` → Rails (same origin) | No CORS needed locally | Call Rails directly with CORS in dev |
| CORS | Allow-list from `CORS_ORIGINS`, `/api/*` only; required in production (boot fails if unset) | Deployed SPA and API live on different origins; a silent localhost fallback would hide misconfiguration | `*` origins (too open) |
| Rails frameworks | Only ActiveRecord, ActionController, ActiveJob, ActionView loaded | API has no uploads, mail, rich text or websockets; smaller surface, faster boot | Default full stack |
