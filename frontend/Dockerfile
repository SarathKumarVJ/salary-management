# Production image for the SPA: build with Node, serve the static files with Caddy.
# VITE_API_URL (the API's https:// URL) is baked in at build time; Railway passes service variables as build args.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
RUN npm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
