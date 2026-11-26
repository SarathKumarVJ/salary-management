# Salary Management

A web app for the HR Manager of a 10,000-employee organisation to keep salary records accurate and answer
**"how do we pay people?"** in seconds: min / median / average / max pay by country, job title and department,
headcounts, and a side-by-side country comparison in USD.

Built for the Incubyte Staff Engineer (Ruby on Rails) assessment.

## Features
- **Sign-in** for the HR Manager (bearer-token sessions; only the `hr_manager` role gets in).
- **Employees:** paginated list with search (name or email), filters (country, department, job title), sorting,
  CSV export of the filtered list, and create / edit / delete with validation messages next to each field.
- **Insights:** salary statistics grouped by country, job title or department, with an optional country filter,
  the median first, and one chart. Currencies are never mixed; cross-country figures use fixed, dated USD rates.
- **10,000 seeded employees** generated deterministically in about a second.

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
                              # (HR Manager + 10,000 employees, about a second)
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

## Documentation
- [Requirements](docs/requirements.md): scope, assumptions and what is deliberately left out
- [Design](docs/design.md): architecture, data model, API, algorithms (exact median in MySQL), trade-offs
- [Plan](docs/plan.md): delivery slices and estimates
- [AI prompts](docs/ai-prompts/): how AI was used, step by step
