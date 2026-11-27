# 07 — Job title filter follows department (after deploy)

**Tool:** Claude Code (agentic CLI)

## Goal
A product improvement I noticed while using the deployed app.

## Prompt
> In Employees, I think Department & job title should be connected and job title dropdown options should be filtered
> by Department selection. What do you think?

## What the AI produced
- Agreed, and checked the data first: the seeder picks a department, then a title from that department's list, so
  "Engineering + Accountant" always returned an empty list.
- A plan before any code: `/filters` also returns `job_titles_by_department`, built from the pairs actually in use
  (so titles typed in by HR appear too); the list narrows the job title options and drops a title that doesn't
  belong to a newly chosen department. It left the form's free-text job title alone, since the brief only asks for
  list filters.
- Tests first (backend spec, two page tests), then a mutation check on the clearing logic.
- The review found two real problems:
  - **Security:** `?department=constructor` (or `__proto__`) in a crafted link crashed the page, because the URL value
    was used as an object key. Fixed with an own-property lookup (`Object.hasOwn`), with a test that failed first.
  - **Bugs:** "Finance" and "finance" became two departments, because Ruby grouped case-sensitively while MySQL's
    collation doesn't. Fixed by grouping the way the database compares, with a spec.

## What I changed / decided
- The idea and the call to build it were mine; I asked the AI's opinion before committing to it.
- Accepted the reviewers' view that the feature is justified UX polish within the existing "filter by department,
  job title" requirement, not new scope.
