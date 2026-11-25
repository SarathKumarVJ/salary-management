# Requirements (v1)

## Goal
Replace ACME's spreadsheets with a web app where the HR Manager can keep salary data for
~10,000 employees in several countries accurate, and answer **"how do we pay people?"** in seconds
instead of building pivot tables by hand.

**Persona:** HR Manager. Must sign in. The `hr_manager` role has full access to every employee record, and no one else gets in.

## Questions the app must answer
1. What is the min / median / average / max salary **in a country**? (Median is shown first; averages are skewed by a few high earners.)
2. What does a **job title** pay, both org-wide and within one country?
3. How many people work in each country / department / job title?
4. How do countries compare **side by side**? (Normalised to USD at fixed, dated rates.)

## In scope
| Feature | Acceptance criteria |
|---|---|
| Sign-in & access | The HR Manager signs in with email and password, and can sign out. Every API endpoint except sign-in and the health check requires a valid session (otherwise 401). A signed-in user without the `hr_manager` role gets 403. A wrong password shows a generic "invalid email or password" message. |
| Employee records | Create, view, edit and delete an employee: full name, email (unique), job title, department, level, country, salary, hire date. Currency comes from the country, so it can't be entered wrong. Invalid input shows a message next to the field. |
| Browse & find | Paginated list (25 per page by default). Search by name or email. Filter by country, department, job title. Sort by name, salary or hire date. Never loads all 10k rows at once. |
| Salary insights | Questions 1–4 above, as tables (plus one chart). The figures always respect the active country filter. |
| Export | Download the current filtered list as CSV, so HR can still do ad-hoc analysis in Excel. |
| Seed data | A deterministic script that creates 10,000 realistic employees (names from text files) in seconds. |

## Non-functional
- **Fast at 10k rows:** list and insights respond in < 300 ms locally. Aggregates are computed in SQL with indexes, never in Ruby.
- **Correct money:** salaries are stored as `decimal(12,2)`, never floats. The app never averages two currencies together.
- **Quality:** TDD, with fast and deterministic tests (RSpec + Vitest). CI runs lint, security scans and tests.
- **Shipped:** a deployed app, a demo video, and incremental commits with the design and AI prompts documented.

## Deliberately left out (and why)
| Left out | Why |
|---|---|
| User management UI, password reset, SSO / MFA | HR Manager accounts are created by seed or console. Self-service account management is its own feature. Role checks are already enforced, so it slots in later. |
| Fine-grained permissions (e.g. HR for one country only) | One persona in the brief. A single `hr_manager` role keeps authorization to one guard rather than a policy framework. |
| Salary history / audit trail | Valuable ("who changed what, when?"), but it doubles the data model. The current salary answers every question above. |
| CSV/Excel **import** | Mapping columns, validating rows and reporting partial failures is a product of its own. Seeding covers the 10k rows; export covers the trip back to Excel. |
| Live exchange rates | Adds an external dependency and makes figures change from one day to the next. Fixed, dated rates are good enough for comparison, and the rate date is shown. |
| Payroll, tax, bonus, benefits, approval workflows | A different product (paying people, not understanding pay). |
| Gender / ethnicity pay-gap analysis | Needs sensitive personal data the brief doesn't provide, and careful legal handling. Better collected on purpose than invented in seed data. |
| Soft delete / leaver status | Delete is a hard delete with a confirmation step. Tracking leavers belongs with the audit trail above. |

## Assumptions (awaiting recruiter confirmation)
- React frontend (the brief lists React/Next for the UI).
- Salaries are stored in local currency, with a USD-normalised view for comparing countries.
- Sign-in with a single `hr_manager` role, since the brief's persona is "HR Manager of the org".
- Works fully locally first. Then deploy to a low-cost host (Railway recommended, can change) with a recorded video demo (see `docs/design.md` → Deployment).
