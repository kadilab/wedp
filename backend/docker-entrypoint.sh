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

# Reconcile tables that drifted from the migration history (created via
# `prisma db push` in dev). Idempotent — no-op when the schema is already
# correct. Fixes 500s on POST /creators/me/bank-accounts on drifted DBs.
echo "==> Reconciling creator_bank_accounts schema..."
node scripts/fix-bank-accounts.js || echo "WARN: bank-accounts reconcile skipped"

if [ "$RUN_SEED" = "true" ]; then
  echo "==> Seeding database..."
  node prisma/seed.js || true
fi

echo "==> Starting server..."
exec "$@"
