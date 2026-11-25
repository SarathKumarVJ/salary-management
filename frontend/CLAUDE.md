# Frontend (React + Vite + TypeScript)

## Stack
React 19, Vite 8, TypeScript, TanStack Query (server state), React Router, a UI kit (MUI or shadcn/ui — pick one, keep it), Vitest + React Testing Library, MSW for API mocks.
Owner has limited production React experience: **keep it simple, idiomatic, function components + hooks only.** Explain non-obvious patterns in the step summary.

## Structure (src/)
- `api/` fetch client + typed endpoint functions (`employees.ts`, `insights.ts`)
- `features/employees/` list, form, hooks (`useEmployees`)
- `features/insights/` charts/tables for salary stats
- `components/` shared UI
- `types/` shared TS types matching API JSON

## Conventions
- API base URL from `VITE_API_URL`: unset in dev (same-origin `/api`, Vite proxies to `localhost:3000`); set to the Rails URL in production (allowed via `CORS_ORIGINS`).
- Server-side pagination/filtering; never fetch all 10k employees.
- Handle loading / empty / error states on every screen.
- Accessible forms (labels, validation messages from API `errors`).
- Tests: behavior-level RTL tests for list, create/edit form, insights page.

## Commands
- `npm run dev` · `npm run test` · `npm run lint` · `npm run build`

## Do not
- Run `git commit`/`push`. Add heavy dependencies without justification.
