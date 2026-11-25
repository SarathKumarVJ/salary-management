# Backend (Rails API)

## Stack
Ruby 3.4, Rails 7.2+/8 `--api`, RSpec (+ FactoryBot, shoulda-matchers), MySQL 8 (dev/test), rack-cors, Kaminari or pagy for pagination, rubocop-rails-omakase.

## Conventions
- Thin controllers: parse params → call service/query → render JSON. Strong params always.
- Business logic in models (validations, scopes) and small POROs under `app/services` and `app/queries`.
  - `Employees::SearchQuery` — filtering + pagination
  - `Insights::SalaryStats` — aggregates (min/avg/max/median by country, job title)
- JSON via simple serializers (`app/serializers`) or `as_json(only:)`; consistent error shape `{ "errors": [..] }`.
- API namespace: `/api/v1/...`. Correct HTTP status codes (201, 204, 404, 422).
- DB: indexes on `country`, `job_title`, `department`, and composite where queried together. Use SQL aggregation, never load 10k rows into Ruby.
- Median: use a window/ordered-offset query (MySQL 8 has no `percentile_cont`; use ROW_NUMBER() window functions); document the choice.
- Money: store integer minor units or `decimal(12,2)`; never float. Store currency code per employee.
- Seeds: `db/seeds.rb` reads `db/seeds/first_names.txt` + `last_names.txt`, builds 10,000 rows, `insert_all` in batches of 1,000. Must run in seconds.

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
