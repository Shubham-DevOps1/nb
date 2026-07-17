# Stage 1: build the Angular app
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve the static build via nginx, reverse-proxying /api to the
# backend-ai service. Angular's new @angular/build:application builder
# (no SSR configured in this project) outputs to dist/frontend/browser -
# if a future Angular upgrade changes that path, this COPY will fail loudly
# at build time rather than silently serving a stale/empty directory.
FROM nginx:1.27-alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
