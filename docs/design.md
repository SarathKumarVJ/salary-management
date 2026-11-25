# Design & Trade-offs

## Architecture
React SPA (Vite) → JSON REST (`/api/v1`) → Rails API → MySQL.

## Decisions
| Decision | Choice | Why | Alternative |
|---|---|---|---|
| Repo layout | Monorepo | One review link, one CI, shared docs | Two repos |
| Backend | Rails API-only | Owner's core strength | Full-stack Rails + Hotwire |
| Frontend | React + Vite + TS | Role asks for React | Hotwire/Turbo |
| Insights | SQL aggregates | Avoid loading 10k rows | Ruby enumerables |
| Seeding | `insert_all` batches | Speed | `create!` loop |
| Dev API access | Vite proxies `/api` → Rails (same origin) | No CORS needed locally; mirrors a single-origin deploy | Call Rails directly with CORS in dev |
| CORS | Allow-list from `CORS_ORIGINS`, `/api/*` only; required in production (boot fails if unset) | Deployed frontend and API live on different origins; a silent localhost fallback would hide misconfiguration | `*` origins (too open) |
| Rails frameworks | Only ActiveRecord, ActionController, ActiveJob, ActionView loaded | API has no uploads, mail, rich text or websockets; smaller surface, faster boot | Default full stack |

(Fill in as work progresses.)
