#!/usr/bin/env bash
set -e

echo "==> Applying database migrations..."
for i in $(seq 1 15); do
  if npx prisma migrate deploy; then
    break
  fi
  echo "Database not ready yet, retrying in 5s... ($i/15)"
  sleep 5
done

if [ "$RUN_SEED" = "true" ]; then
  echo "==> Seeding database..."
  node prisma/seed.js || true
fi

echo "==> Starting server..."
exec "$@"
