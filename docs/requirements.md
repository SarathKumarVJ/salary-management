# Requirements (draft v0 — first commit)

## Context
Internal tool for an HR Manager of an organisation with ~10,000 employees to manage employees and salaries and see salary insights.

## Persona
HR Manager (single role; auth out of scope unless clarified).

## Functional
1. Employee CRUD: full name, email, job title, department, level, country, salary, currency, hire date.
2. List: server-side pagination, search by name, filter by country / job title / department, sort by salary & name.
3. Insights: min / avg / median / max salary by country; same by job title; headcount; optional department/level breakdown.
4. Seed: 10,000 employees from `first_names.txt` + `last_names.txt`, fast (batched `insert_all`).

## Non-functional
- Responsive list/search on 10k rows (indexes, SQL aggregates).
- Unit + request tests (TDD), frontend component tests.
- Deployed app, demo video, repo with incremental commits, AI prompts + trade-offs documented.

## Open questions (sent to recruiter)
- [ ] Is Hotwire acceptable instead of React? (proceeding with React)
- [ ] Multi-currency: store local currency only, or convert to a base currency for insights?
- [ ] Authentication required?
- [ ] Deployment target preference?
- [ ] Expected insight set beyond country / job title?

## Assumptions (until answered)
- No auth; single HR persona.
- Salary stored in local currency; insights grouped within a country (no cross-currency math).
- MySQL 8 (matches owner's production experience); Postgres only if the deploy target requires it.
