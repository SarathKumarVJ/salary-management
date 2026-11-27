# 06 — Local end-to-end, GitHub and deploy (slices 12–13)

**Tool:** Claude Code (agentic CLI)

## Goal
Prove the whole system works from a fresh clone, publish the repo, then deploy it.

## Prompts
The planned slices started the same way as in
[03](03-hygiene-model-auth.md#workflow-specification-in-the-repo-short-prompts-at-decision-points), from their
`docs/plan.md` rows:
- `done, verify the git log again | proceed phase 12 and provide me the report`:
  > Fresh clone → `bin/setup`, seed, sign in, every flow by hand; fix gaps; README setup verified
- `proceed phase 13`: deploy, with env vars, the production seed and a smoke test.

The deploy itself was diagnostic work: I made the changes in the GitHub, Railway and Aiven consoles and pasted back
what I saw, for example:
> There is 3 pull requests from bot … There is no README file.

> railway build failed … (build log pasted)

> I can only add only one root DIR. how can I add web?

> Unable to create service for MYSQL database. Free bees is completed … Can we create mysql in any other free service?

## What the AI produced
- **Slice 12:** a fresh clone in a scratch folder, against a separate e2e database so my dev data wasn't touched, then
  every flow through the dev server. It found the README claimed seeding was a separate step, when `db:prepare` already
  seeds a new database, and corrected it. Measured over HTTP: list 13–26 ms, insights 17–47 ms, full CSV ~565 ms.
- **GitHub:** Dependabot PRs triaged (merge the two Actions bumps, ignore `@types/node` majors) and the first README.
- **Slice 13:** a Caddy image for the SPA with a Content-Security-Policy, a build that refuses an `http://` API URL,
  and the Railway variables. It diagnosed each failure from the pasted logs:
  - "No start command" → Railway was building the repo root; each service needs its own root directory.
  - `URI::InvalidURIError … :@:` → the API's `DATABASE_URL` referenced a MySQL service that didn't exist.
  - Recommended **Aiven's free MySQL 8** over MySQL-compatible engines, because the median query and indexes were
    built on MySQL 8. It checked in the installed `mysql2` gem that `?ssl_mode=required` is parsed.
- **After deploy:** a live smoke test (health, 401s, CORS allowed only from the SPA, CSP, deep links). It found a real
  bug live: **`index.html` had no cache header, and a missing JS file came back as HTML cached for a year**, which
  would show a blank page after a redeploy. The fix was verified live after redeploying (404 for missing assets,
  `no-cache` for the app, HSTS).

## What I changed / decided
- Did every external step myself (GitHub repo, Railway project, Aiven database, secrets). The smoke tests ran without
  signing in, so the AI never needed the production password.
- Chose Railway + Aiven after the database limit, keeping the config env-only so the host can change.
- The AI's attempt to download a Caddy binary to test the config locally was blocked by the session's permission
  checks; it didn't work around that and verified on the live deploy instead.
- Left two security items open, written down as known limitations: verifying Aiven's TLS certificate, and the
  proxy configuration the sign-in rate limit relies on.
