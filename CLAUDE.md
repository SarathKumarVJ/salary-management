# Salary Management — Incubyte Assessment

Employee salary management app for an HR manager of a 10,000-employee org.
Monorepo: `backend/` (Rails API) + `frontend/` (React + Vite + TypeScript) + `docs/`.

## Hard rules
- **NEVER run `git commit`, `git push`, or rewrite history.** The owner reviews every diff and commits personally. (Also enforced in `.claude/settings.json`.) When a unit of work is done, run `git status` / `git diff --stat` and propose a commit message in chat instead.
- Work in small, reviewable steps. One feature slice per step, then stop for review.
- TDD: write a failing test first, make it pass, then refactor. Show the red→green in your summary.
- Never invent requirements. If ambiguous, check `docs/requirements.md`, then ask.
- Do not touch secrets (`.env`, `master.key`).

## Layout
- `backend/`  Rails 7+/8 API-only, RSpec, MySQL 8 — see `backend/CLAUDE.md`
- `frontend/` React + Vite + TypeScript — see `frontend/CLAUDE.md`
- `docs/requirements.md` source of truth for scope (commit first)
- `docs/design.md` architecture + trade-offs
- `docs/ai-prompts/` prompts used with AI (assessment asks for these)
- `scripts/bootstrap.sh` generates the Rails and React apps

## Domain summary
- Employee: full_name, job_title, department, country, salary (+ currency), hire date, level, email.
- HR manager can: CRUD employees, browse/search/filter (paginated), view salary insights
  (min / median / avg / max by country and by job title; headcount; optional by department/level).
- Scale: 10,000 seeded employees (first/last names from text files, `insert_all` in batches).

## Working agreement
- Incremental steps; after each, summarize: what changed, tests run, what to review.
- Keep it simple and pragmatic (quality with pragmatism). No speculative abstractions.
- Update `docs/design.md` when a trade-off is made; log notable AI prompts in `docs/ai-prompts/`.
