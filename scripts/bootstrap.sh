#!/usr/bin/env bash
# Generates the Rails API and React app inside this monorepo. Run once, locally.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Keep our CLAUDE.md files; rails/vite generators refuse non-empty dirs otherwise.
mkdir -p .tmp-keep
mv backend/CLAUDE.md .tmp-keep/backend.md
mv frontend/CLAUDE.md .tmp-keep/frontend.md
rmdir backend frontend

gem list -i rails >/dev/null || gem install rails
rails new backend --api -T --database=mysql --skip-git --skip-kamal --skip-solid
(cd backend && bundle add pagy rack-cors && bundle add rspec-rails factory_bot_rails shoulda-matchers faker --group development,test)
(cd backend && bin/rails generate rspec:install)

npm create vite@latest frontend -- --template react-ts
(cd frontend && npm install && npm install @tanstack/react-query react-router-dom && npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom msw)

mv .tmp-keep/backend.md backend/CLAUDE.md
mv .tmp-keep/frontend.md frontend/CLAUDE.md
rmdir .tmp-keep

echo "Done. Next: review, then 'git add -A && git commit' yourself."
