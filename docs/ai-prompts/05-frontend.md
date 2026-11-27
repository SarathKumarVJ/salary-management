# 05 — React frontend: sign-in, employee list, form, insights (slices 8–11)

**Tool:** Claude Code (agentic CLI)

## Goal
A simple, idiomatic React SPA (function components, TanStack Query, MUI) with behaviour-level tests against mocked
API responses (MSW). I have less production React experience than Rails, so I asked for plain patterns and an
explanation of anything non-obvious.

## Prompts
Same workflow as in [03](03-hygiene-model-auth.md#workflow-specification-in-the-repo-short-prompts-at-decision-points).
For example, `done, verify the git log again | proceed phase 10 and provide me the report` started slice 10,
recorded in `docs/plan.md` as:
> Create / edit / delete, inline API validation errors, tests

Slices 8, 9 and 11 started the same way from their own rows, with `frontend/CLAUDE.md` adding the standing
constraints: function components and hooks only, server-side pagination, loading / empty / error states on every
screen, accessible forms, behaviour-level tests. Each review report was answered with
`fix flagged and provide me the report`.

## What the AI produced
- **Slice 8 (sign-in):** API client with the bearer token, token store in `localStorage`, protected routes, cache
  cleared on sign-out. Review fixes:
  - Sign-out cleared the token only after the server replied → cleared at once.
  - Signing out in one tab didn't sign out the others → listens to the `storage` event.
  - A late 401 from an old request could wipe a fresh token → only clears if it's still the token that was sent.
  - It mutation-checked these: removing each fix made exactly its test fail.
  - It noticed MSW 3 had renamed `onUnhandledRequest` to `onUnhandledFrame`; the old name was silently ignored,
    so unmocked calls would only have warned.
- **Slice 9 (list):** list state in the URL (refresh / back / shared links keep the view), CSV fetched with the token
  and saved as a blob. Review fixes: only known parameters reach the API (`?format=csv` in the URL broke the page),
  a "page past the end" state, salary sort only with a country.
- **Slice 10 (form):** inline API validation errors, delete confirmation. Review found a real data bug: moving from one
  employee's form to another could keep the first one's values, so **Save would overwrite employee 8 with employee 7's
  data**. Fixed by keying the form on the id. Also: unsaved edits lost on a background refetch, a delete error hidden
  behind the dialog.
- **Slice 11 (insights page):** grouped table, country filter, one bar chart in plain CSS (no chart library).
  Review found that **a hand-typed `?country=foo` blanked the page** on both Insights and the list, because
  `Intl.DisplayNames` throws on invalid codes. Fixed and confirmed with tests that fail without the fix.

## What I changed / decided
- Kept the scope to the brief: one chart, a headcount summary line instead of summary cards (which would repeat the table).
- Deferred the Content-Security-Policy and an https-only API URL to the deploy slice, where they belong.
