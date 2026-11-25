# Backend (Rails API)

## Stack
Ruby 3.4, Rails 8.1 `--api`, RSpec (+ FactoryBot, shoulda-matchers), MySQL 8 (dev/test), rack-cors, pagy for pagination, rubocop-rails-omakase.

## Conventions
- Thin controllers: parse params → call service/query → render JSON. Strong params always.
- Business logic in models (validations, scopes) and small POROs under `app/services` and `app/queries`.
  - `Employees::SearchQuery` — search, filter, sort (pagination stays in the controller via pagy)
  - `Insights::SalaryStats` — headcount + min/avg/max/exact median by country, job title or department, in one SQL pass; never mixes currencies (see docs/design.md)
- JSON via simple serializers (`app/serializers`) or `as_json(only:)`; one error shape everywhere: `{ "errors": { field: [msgs] } }`, using `base` for non-field errors (e.g. 401 `{ "errors": { "base": ["Not signed in"] } }`); 422 renders `record.errors` directly.
- API namespace: `/api/v1/...`. Correct HTTP status codes (201, 204, 400, 401, 403, 404, 422).
- DB: indexes on `country`, `job_title`, `department`, and composite where queried together. Use SQL aggregation, never load 10k rows into Ruby.
- Median: use a window/ordered-offset query (MySQL 8 has no `percentile_cont`; use ROW_NUMBER() window functions); document the choice.
- Money: store integer minor units or `decimal(12,2)`; never float. Store currency code per employee.
- Seeds: `db/seeds.rb` creates the HR Manager (env vars; dev defaults only in development/test) and calls `Employees::Seeder`: 10,000 deterministic rows from `db/seeds/first_names.txt` + `last_names.txt`, `insert_all!` in batches of 1,000 inside one transaction, currency set explicitly. Runs in about a second.

## Testing (TDD, RSpec)
- Order: model spec → service/query spec → request spec. Write the failing spec first.
- `bundle exec rspec` must be green before a step is "done".
- Request specs for every endpoint (happy path + validation errors + 404).
- Factories in `spec/factories`; no fixtures.

## Commands
- `bin/rails db:setup` · `bin/rails db:seed` · `bundle exec rspec` · `bundle exec rubocop -A`
- `bin/rails s -p 3000`

## Do not
- Run `git commit`/`push`. Add gems without justifying them in your summary.
