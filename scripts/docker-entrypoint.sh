#!/bin/sh
# Entry point container PALORA.
# Env yang dibutuhkan saat pertama kali: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD (untuk superuser).
set -e
cd /pb

./pocketbase migrate up --dir=/pb/pb_data

if [ -n "$PB_ADMIN_EMAIL" ] && [ -n "$PB_ADMIN_PASSWORD" ]; then
  ./pocketbase superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" --dir=/pb/pb_data
fi

exec ./pocketbase serve --http="0.0.0.0:${PORT:-8090}" --dir=/pb/pb_data
