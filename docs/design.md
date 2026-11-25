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

(Fill in as work progresses.)
