# 01 — Brief analysis, scaffold review and delivery plan

**Tool:** Claude Code (agentic CLI)

## Goal
Before writing any feature code: understand the brief, check the scaffold commits against it,
and get a sliced plan with estimates.

## Prompts
1. > I got the assessment email from Incubyte … I have already done the scaffold setup. Can you make an
   > analysis, review the initial commits codebases, draft the plan, breakdown & its estimation?
2. > Before start, save this plan. Review the CLAUDE.md and `.claude/` of another project of mine.
   > Copy over any instruction that is useful. I think the over-engineering instructions are worth it.

## What the AI produced
- A table comparing the brief with the current state. It caught that the brief wants a
  **"what we deliberately leave out and why"** section, which requirements v0 doesn't have.
- Scaffold findings it verified by running the tools, not just reading files:
  - `npm run build` fails on the default Node 18 (Vite 8 needs Node ≥ 20.19).
  - The CI workflow sits in `backend/.github/`, which GitHub ignores.
  - 10 RuboCop offences in the `Gemfile`.
  - Smaller items: CORS not enabled, RSpec support files missing, framework trimming.
- Open decisions with a recommendation for each: currency normalisation, MySQL hosting on a free tier, auth, UI kit.
- 13 slices totalling about 27–28h, with the critical path and the order to cut scope → `docs/plan.md`.
- Workflow tooling adapted from another of my projects (a large legacy Rails app):
  - `/review-parallel` with four reviewers: bugs, security, **over-engineering**, style.
  - `/test`, `/migrate` and `/docs` commands, rewritten for this stack.
  - A guard hook that inspects the whole Bash command.
- Things it chose not to copy, with reasons: the PR, standup and debug commands, the multi-database rules, and anything specific to the legacy domain.

## What I changed / decided
- Asked for the plan to be saved in the repo as a deliverable, not left in chat.
- Pointed it at my existing Claude setup instead of writing workflow rules from scratch.
- Highlighted the over-engineering review: the brief says *"not the most complex system, but good
  engineering judgment"*, so a dedicated reviewer for unnecessary complexity runs after each slice.
- The hook was tested against 19 sample commands (deny / ask / allow) before it was registered.
