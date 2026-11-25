# Frontend (React + Vite + TypeScript)

## Stack
React 19, Vite 8, TypeScript, TanStack Query (server state), React Router, MUI, Vitest + React Testing Library, MSW for API mocks.
Owner has limited production React experience: **keep it simple, idiomatic, function components + hooks only.** Explain non-obvious patterns in the step summary.

## Structure (src/)
- `api/` `client.ts` (fetch + bearer token, `ApiError`), `token.ts` (token store), typed endpoint functions (`session.ts`, `employees.ts`, `insights.ts`)
- `features/auth/` sign-in page
- `features/employees/` list page (queries inline: no hook until a second user needs it), form
- `features/insights/` charts/tables for salary stats
- `components/` shared UI
- `types/` shared TS types matching API JSON
- `format.ts` display helpers (`formatMoney`, `countryName`), shared by the list and insights
- `test/` MSW `server` (baseline responses for session, employees, filters; tests override with `server.use`) and `renderApp(path)`

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
