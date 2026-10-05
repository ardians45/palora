# PALORA - satu container: PocketBase (API + database + file) sekaligus menyajikan frontend.
# Cocok untuk Railway / Fly.io / VPS. Data disimpan di /pb/pb_data -> WAJIB dipasang volume.

# --- 1. build frontend ---
FROM node:22-alpine AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx vite build

# --- 2. runtime PocketBase ---
FROM alpine:3.20
ARG PB_VERSION=0.40.4
RUN apk add --no-cache ca-certificates unzip wget \
 && wget -q https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip -O /tmp/pb.zip \
 && unzip /tmp/pb.zip pocketbase -d /pb \
 && rm /tmp/pb.zip

WORKDIR /pb
COPY backend/pb_migrations ./pb_migrations
COPY backend/pb_hooks ./pb_hooks
COPY --from=web /app/dist ./pb_public
COPY scripts/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8090
ENTRYPOINT ["/entrypoint.sh"]
