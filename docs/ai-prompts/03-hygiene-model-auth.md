# 03 — Scaffold hygiene, Employee model and sign-in API (slices 0, 2, 3)

**Tool:** Claude Code (agentic CLI)

## Goal
Fix the scaffold problems found in 01, then build the first backend slices test-first: the `Employee` model and
HR Manager sign-in.

## Workflow: specification in the repo, short prompts at decision points
The specification lived in versioned files that the agent reads on every turn, not in chat messages:
- **What to build:** `docs/plan.md`. Each slice's scope, acceptance criteria and estimate, agreed before any code.
- **How to build it:** `CLAUDE.md` (root, `backend/`, `frontend/`):
  - Hard rules: TDD with the red → green shown, never commit or push, never invent requirements, minimal code,
    linters clean.
  - The stack's conventions (error shape, folder layout, money as decimal, SQL aggregation).
- **How to judge it:** a four-reviewer rubric (bugs, security, over-engineering, style).
  - Project-specific checks, e.g. money as decimal, allow-listed sort columns, currencies never mixed.
  - A fixed triage: fix before commit / fix soon / consider.

Each slice therefore starts with one line that points at the spec, and I decide at two gates:

| Step | My prompt | What it triggers |
|---|---|---|
| Start | `done, verify the git log again \| proceed phase N and provide me the report` | The agent checks my commit landed, builds slice N from `plan.md` test-first, runs the linters and the four reviewers, then reports. It changes nothing yet. |
| Gate 1 | `fix flagged and provide me the report`, or a chosen subset | Approved findings fixed test-first, everything re-verified, a commit proposed |
| Gate 2 | (no prompt) I review the diff and commit | The agent can't commit or push |

**Why:** it's repeatable (the same rules every slice) and auditable (the rules are in git). It's also cheap to steer:
my effort goes into decisions at the gates, not into re-typing requirements. The later logs only record what was
specific to each slice.

## Prompts
Exact words, with the spec each one pointed at.
- `proceed phase 0` started slice 0, recorded in `docs/plan.md` as:
  > Node 24; root CI with rspec + frontend jobs; rubocop; CORS; RSpec support; trim frameworks; Vitest + RTL + dev
  > proxy; doc drift
- `proceed` started slice 2:
  > Migration (decimal salary, currency from country, indexes incl. composite country+job_title), validations,
  > factory, model specs
- `proceed with minimal code` started slice 3, adding a constraint on top of the spec:
  > `User` (`has_secure_password`, `role` enum) + `Session` (token, expiry); `POST/GET/DELETE /api/v1/session`;
  > `authenticate!` (401) in the API base controller; request specs
- Each review report was answered with `fix flagged and provide me the report`, or with `proceed` to accept its
  recommendation where it offered alternatives (the hire-date rule on slice 2).

## What the AI produced
- **Slice 0 (hygiene):** Node 24 as default, CI moved to the repo root with RSpec and frontend jobs, RuboCop clean,
  CORS from env, RSpec support files, unused Rails frameworks removed, Vitest + Testing Library + dev proxy.
- **Slice 2 (model):** `decimal(12,2)` salary, **currency derived from country** (so "India / USD" can't be stored),
  5 indexes each with a reason, validations. Review findings it fixed or planned:
  - Strings over 255 characters gave a 500 (MySQL strict mode) → length validations.
  - **The hire-date check used the UTC date**, so an HR Manager in India entering today's date between 00:00 and
    05:30 IST would be told it's in the future. It offered three options; I chose "allow one day ahead of UTC".
  - `insert_all` skips the currency callback → the seeder (slice 6) must set currency itself, with a spec.
  - Two simultaneous creates with the same email → `RecordNotUnique` must become a 422 (slice 4).
- **Slice 3 (auth):** `has_secure_password`, `Session` rows with a 12-hour expiry, bearer token, `authenticate_by`
  (timing-safe). Review fixes: **one error shape everywhere** (`{ errors: { field: [...] } }`, `base` for non-field
  errors), a sign-in rate limit (10 per 3 minutes), case-sensitive token collation, 12-character password minimum,
  and a session that expires at exactly 12 hours. It proved the boundary spec by briefly restoring the old rule
  and watching the spec fail.

## What I changed / decided
- Kept recruiter correspondence out of the repo and out of AI-written files.
- My Claude Code setup (`.claude/`) stays private. The repo's `CLAUDE.md` is committed; nothing committed depends on
  the private commands or hooks.
- Chose the hire-date option and the error format from the AI's alternatives; asked for minimal code on auth.
