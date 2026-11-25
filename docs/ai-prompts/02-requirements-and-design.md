# 02 — Requirements v1 and design

**Tool:** Claude Code (agentic CLI)

## Goal
Turn the brief and the plan into a one-page requirements doc and a design doc before any feature code,
as the brief asks ("write a one-page requirements document before building").

## Prompt
> proceed phase 1

The context already in the session: the brief, `docs/plan.md` (slice 1), and the open questions I had sent to the recruiter.

## What the AI produced
- **`docs/requirements.md` v1:**
  - The goal, framed as the 4 "how do we pay people?" questions the app must answer.
  - Each in-scope feature with acceptance criteria.
  - Non-functional targets.
  - A **"Deliberately left out (and why)"** table: auth, salary history, CSV import, live FX rates, payroll, pay-gap analysis, soft delete.
  - Assumptions, clearly marked as awaiting the recruiter's reply.
- **`docs/design.md`:**
  - A Mermaid architecture diagram.
  - The `employees` table with the reason for each index.
  - The `/api/v1` endpoint list.
  - The approach to an exact median in MySQL 8 using window functions.
  - USD normalisation using fixed, dated rates.
  - Deployment options.
  - An extended decisions table.
- **A product decision it proposed:** currency is **derived from country**, not typed in. This prevents rows like "India / USD"
  that would silently corrupt every per-country aggregate.

## What I changed / decided
- I went ahead without the recruiter's answers. Every assumption is labelled, so the docs can be updated when the reply arrives.
- **I overrode the AI's draft on auth.** It had put login and roles under "left out". I moved **role-based sign-in into scope**,
  because the brief names a specific persona ("HR Manager of the org"), so access should be limited to that role.
  The AI then designed it: `has_secure_password`, revocable session rows, a bearer token (the SPA and API run on different origins),
  and one `hr_manager` guard instead of a policy gem. It also added 2 slices and about 4h to the plan.
- **Deploy: local first.** Railway stays the recommended host, but the whole system has to run end to end locally before any
  hosting work. I can switch hosts later because config is env-only.
- Still to confirm: MUI as the UI kit.
