# Salary Management

A web app for the HR Manager of a 10,000-employee organisation to keep salary records accurate and answer
**"how do we pay people?"** in seconds: min / median / average / max pay by country, job title and department,
headcounts, and a side-by-side country comparison in USD.

Built for the Incubyte Staff Engineer (Ruby on Rails) assessment.

**Live demo:** https://web-production-c94e95e4.up.railway.app (sign-in credentials are shared with the recruiter
separately; the data is the generated seed, not real people).

## Features
- **Sign-in** for the HR Manager (bearer-token sessions; only the `hr_manager` role gets in).
- **Employees:** paginated list with search (name or email), filters (country, department, job title), sorting,
  CSV export of the filtered list, and create / edit / delete with validation messages next to each field.
- **Insights:** salary statistics grouped by country, job title or department, with an optional country filter,
  the median first, and one chart. Currencies are never mixed; cross-country figures use fixed, dated USD rates.
- **10,000 seeded employees** generated deterministically in about a second locally.
- Job title options follow the chosen department, so the filters can't combine into an always-empty list.

## Stack
| | |
|---|---|
| Backend | Ruby 3.4, Rails 8.1 (API only), MySQL 8, RSpec, RuboCop, Brakeman |
| Frontend | React 19, TypeScript, Vite 8, MUI, TanStack Query, React Router, Vitest + Testing Library + MSW |
| CI | GitHub Actions: security scan, lint and tests for both apps |

## Run it locally

Prerequisites: Ruby 3.4.13 (`.ruby-version`), Node 24 (`.nvmrc`), MySQL 8 running locally.

```sh
# 1. Backend API on http://localhost:3000
cd backend
cp .env.example .env          # set DB_USERNAME / DB_PASSWORD for your MySQL
bin/setup --skip-server       # installs gems; a new database is created and seeded
                              # (HR Manager + 10,000 employees, ~1 s locally)
bin/rails db:seed             # only for an existing, empty database (safe to re-run)
bin/rails server

# 2. Frontend on http://localhost:5173 (in a second terminal)
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173 and sign in with the development account **hr@acme.test / local-dev-password**
(created by the seed; production requires `HR_MANAGER_EMAIL` and `HR_MANAGER_PASSWORD`).

If port 3000 is taken, run Rails on another port and point Vite at it:
`bin/rails server -p 3001` and `API_PROXY_TARGET=http://localhost:3001 npm run dev`.

## Tests and checks
```sh
cd backend  && bundle exec rspec && bundle exec rubocop && bin/brakeman
cd frontend && npm run test && npm run lint && npm run build
```

## Key decisions and trade-offs
Details and alternatives for each are in [docs/design.md](docs/design.md#decisions).
- **Rails API + React SPA in one repo.** The role asks for React; one review link and one CI.
- **Currency follows the country** and is never typed in, so "India / USD" can't be stored. Salaries stay in local
  currency (`decimal(12,2)`, never floats); cross-country figures use **fixed, dated USD rates** rather than a live
  FX API, so numbers don't change from day to day.
- **Insights in one SQL query** per request, with an **exact median** from MySQL 8 window functions (MySQL has no
  `PERCENTILE_CONT`). Nothing loads 10k rows into Ruby; currencies are never mixed in one aggregate.
- **Sign-in for the HR Manager persona:** `has_secure_password`, revocable session rows and a bearer token (the SPA and
  API are on different origins), one `hr_manager` role checked in one place. No Devise, no JWT.
- **Offset pagination** (pagy): simple and supports "page N of M"; fine at 10k rows.
- **List state in the URL**, so refresh, back and shared links keep the search and filters.
- **Deploy:** two Railway services (API, static SPA behind Caddy) plus Aiven's free MySQL 8. Config is env-only, so the
  host can change. The SPA sends a strict Content-Security-Policy, because the token lives in `localStorage`.
- **Deliberately left out**, each with a reason: user management, salary history, CSV import, live FX, payroll,
  pay-gap analysis ([docs/requirements.md](docs/requirements.md#deliberately-left-out-and-why)).

## Performance (10,000 employees)
| | Local MySQL 8 (query time) | Over HTTP, local |
|---|---|---|
| Employee list, search, filters | 2–8 ms | 13–26 ms |
| Insights (by country / job title / department) | 8–39 ms | 17–47 ms |
| CSV export, all 10k rows | ~535 ms | ~565 ms |
| Seeding 10k rows | ~1.2 s | (~8 s on the hosted database, over TLS) |

All interactive requests are far below the 300 ms target. Measured with the query cache off; method and `EXPLAIN`
plans in [docs/design.md](docs/design.md#seeding--performance-measured-10000-employees-local-mysql-8).

## Known limitations and next steps
- The database connection is encrypted but doesn't verify Aiven's certificate yet (`ssl_mode=verify_identity` with
  Aiven's CA file would).
- The sign-in rate limit is keyed on the client IP, so any proxy in front of the API must be listed in `trusted_proxies`.
- Expired sessions are never cleaned up (harmless at this scale; a periodic job would do it).
- Small groups in insights (1–2 people) reveal individual salaries; fine for HR-only access.
- The SPA ships as one JS bundle (~600 kB, ~190 kB gzipped); route-level code splitting would help on slow connections.

## Documentation
- [Requirements](docs/requirements.md): scope, assumptions and what is deliberately left out
- [Design](docs/design.md): architecture, data model, API, algorithms (exact median in MySQL), deployment, trade-offs
- [Plan](docs/plan.md): delivery slices and estimates
- [AI prompts](docs/ai-prompts/): how AI was used, step by step

## How AI was used
Built with Claude Code. I wrote the requirements direction and prompts and made the product calls; the AI wrote code
test-first (red → green) and every slice went through four parallel AI reviewers (bugs, security, over-engineering,
style) before I reviewed the diff and committed it myself. The logs in [docs/ai-prompts/](docs/ai-prompts/) record
where I steered or overrode it, and the bugs the reviews caught.
