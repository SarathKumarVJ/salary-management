# syntax=docker/dockerfile:1
# check=error=true

# Production image for the SPA: build with Node, serve the static files with Caddy.
# VITE_API_URL (the API's https:// URL) is baked in at build time; Railway passes service variables as build args.
# Caddy also reads it at runtime for the CSP, so the service needs it as a normal variable too.

# Keep the Node major in sync with /.nvmrc
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
# Without it the bundle calls its own origin, where Caddy answers every /api request with index.html.
RUN test -n "$VITE_API_URL" || (echo "VITE_API_URL build arg is required" >&2 && exit 1)
RUN npm run build

FROM caddy:2.11-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
