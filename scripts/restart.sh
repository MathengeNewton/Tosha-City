#!/usr/bin/env bash
# Local Docker: down → prune stopped containers & dangling images → build → up → quick health checks.
# DB schema / migrations / seed data: handled by the backend on boot (TypeORM + SeedService), not Prisma.
#
# FRESH_DB=1  →  compose down -v (drops named volumes incl. Postgres data). Use after changing DATABASE_* in .env
#               when an old db_data volume was created with different user/password (avoids auth mismatch).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
ENV_FILE="${ENV_FILE:-.env}"

if docker compose version &>/dev/null; then
  DC=(docker compose -f "$COMPOSE_FILE")
elif command -v docker-compose &>/dev/null; then
  DC=(docker-compose -f "$COMPOSE_FILE")
else
  echo "Need Docker Compose (v2: docker compose, or v1: docker-compose)" >&2
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  DC+=(--env-file "$ENV_FILE")
fi

DOWN_ARGS=(--remove-orphans)
[[ "${FRESH_DB:-0}" == "1" ]] && DOWN_ARGS+=(-v)
if [[ "${FRESH_DB:-0}" == "1" ]]; then echo "==> compose down (removing volumes)"; else echo "==> compose down"; fi
"${DC[@]}" down "${DOWN_ARGS[@]}" 2>/dev/null || true

echo "==> prune stopped containers + dangling images"
docker container prune -f
docker image prune -f

echo "==> compose build + up -d"
"${DC[@]}" build
"${DC[@]}" up -d

API_PORT="${BACKEND_HOST_PORT:-4515}"
WEB_PORT="${FRONTEND_HOST_PORT:-3015}"

echo "==> wait for Postgres"
for i in $(seq 1 30); do
  if "${DC[@]}" exec -T db sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' &>/dev/null; then
    echo "    db accepting connections"
    break
  fi
  [[ "$i" -eq 30 ]] && { echo "    db not ready"; exit 1; }
  sleep 2
done

echo "==> verify DB login (pg_isready does not check password)"
db_login_ok=0
for i in $(seq 1 15); do
  if "${DC[@]}" exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -h 127.0.0.1 -c "select 1"' &>/dev/null; then
    db_login_ok=1
    break
  fi
  sleep 2
done
if [[ "$db_login_ok" -ne 1 ]]; then
  echo "    SQL auth failed for POSTGRES_USER from your env vs data in db_data volume." >&2
  echo "    Postgres only applies DATABASE_USER/PASSWORD on first init; changing .env later leaves old roles." >&2
  echo "    Either restore the old DATABASE_* values, or wipe data once: FRESH_DB=1 $0" >&2
  exit 1
fi
echo "    db credentials ok"

echo "==> wait for API (schema + seeds finish on first boot; may take a bit)"
for i in $(seq 1 45); do
  if curl -fsS --max-time 3 "http://127.0.0.1:${API_PORT}/api/health" &>/dev/null; then
    echo "    api ok"
    break
  fi
  [[ "$i" -eq 45 ]] && {
    echo "    api failed" >&2
    "${DC[@]}" logs backend --tail 40
    echo "    If logs show DB password/auth errors, see the note after \"verify DB login\" or use FRESH_DB=1 once." >&2
    exit 1
  }
  sleep 2
done

echo "==> wait for frontend"
for i in $(seq 1 20); do
  if curl -fsS --max-time 3 "http://127.0.0.1:${WEB_PORT}/" &>/dev/null; then
    echo "    web ok"
    break
  fi
  [[ "$i" -eq 20 ]] && { echo "    web failed"; "${DC[@]}" logs frontend --tail 30; exit 1; }
  sleep 2
done

echo "==> status"
"${DC[@]}" ps
echo "Done. API http://127.0.0.1:${API_PORT}/api/health — Web http://127.0.0.1:${WEB_PORT}/"
