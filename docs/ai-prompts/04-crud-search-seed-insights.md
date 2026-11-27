# 04 — Employee API, search, seed and insights backend (slices 4–7)

**Tool:** Claude Code (agentic CLI)

## Goal
Finish the backend: CRUD behind the `hr_manager` role, the paginated list with search / filters / sorting / CSV,
10,000 deterministic seed rows, and the salary insights that answer "how do we pay people?".

## Prompts
Same workflow as in [03](03-hygiene-model-auth.md#workflow-specification-in-the-repo-short-prompts-at-decision-points).
`done, verify the git log again | proceed phase 4 and provide me the report` started slice 4, recorded in
`docs/plan.md` as:
> `/api/v1/employees` behind auth + `require_hr_manager!` (403; first consumer of the role check); 201/204/404/422;
> `{ errors: {} }` shape; `RecordNotUnique` (concurrent duplicate email) → 422; request specs

Slices 5, 6 and 7 started the same way from their own rows (search query, seeds, insights). Each review report was
answered with `fix flagged and provide me the report`; on slice 5 I declined three optional findings ("Nothing,
it's fine").

## What the AI produced
- **Slice 4 (CRUD):** 201 / 200 / 204 / 400 / 403 / 404 / 422, a fixed JSON field list, salary always as a
  2-decimal string. It caught its own slip: the first salary formatting went through a `Float`, contradicting the
  "exact" comment, and replaced it.
- **Slice 5 (list):** `Employees::SearchQuery` (escaped `LIKE`, allow-listed sort), pagy, `/filters`, CSV export.
  Review fixes: search term `q` filtered from logs, CSV built with `pluck`, a UTF-8 BOM so Excel shows accented
  names, spreadsheet-formula escaping, and the note that **sorting by salary across currencies is meaningless**
  (the SPA later only offers it once a country is chosen).
- **Slice 6 (seed):** 10k rows in ~1.2 s, deterministic, weighted countries and levels, inserted in batches in one
  transaction. Profiling took it from 10.8 s to ~1.2 s (`Range#count` was walking ~5,100 dates per row).
  The over-engineering reviewer noticed that **job title didn't affect pay**, so the insights page would have shown
  identical numbers for every title; a title factor was added with a spec.
- **Slice 7 (insights):** `Insights::SalaryStats`, one SQL query per request with an **exact median from MySQL 8
  window functions**, local currency per country, USD only where currencies would otherwise mix. Every median was
  checked against a plain-Ruby recomputation on the 10k rows.

## Mistakes the AI caught in its own work
- **USD conversion was silently using floating point:** quoted rates made MySQL fall back to `DOUBLE`. It proved it
  (the query returned a `Float`) and fixed it with `CAST(? AS DECIMAL(12, 6))`.
- **Its slice 6 performance numbers were 2–4× too optimistic** (`rails runner` had the query cache on). It re-measured
  with the cache off and corrected the already-committed table in `docs/design.md`, saying so.

## What I changed / decided
- Accepted the over-engineering reviewer's **Critical** finding that requirement Q3 (headcount **by department**) was
  missing, and chose one endpoint, `GET /insights?group=country|job_title|department`, instead of three near-identical ones.
- I ran all dev-database writes (reseed, cleanup) myself rather than letting the AI write to my database.
