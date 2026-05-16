#!/usr/bin/env bash
# Local Docker: stop everything → free ports → build → up db → SQL migrations (keep data) → up app → health checks.
# Schema: SQL in backend/scripts/*.sql runs before the API (data backfill). TypeORM synchronize + SeedService run on boot.
#
# FRESH_DB=1  →  compose down -v (drops named volumes incl. Postgres data). Use after changing DATABASE_* in .env
#               when an old db_data volume was created with different user/password (avoids auth mismatch).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
ENV_FILE="${ENV_FILE:-.env}"

# Host ports (read .env before compose so we can free the right bindings)
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi
API_PORT="${BACKEND_HOST_PORT:-4515}"
WEB_PORT="${FRONTEND_HOST_PORT:-3015}"
DB_PORT="${DATABASE_HOST_PORT:-5432}"

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

# Stop any container publishing a host port (this stack or a leftover from a failed up).
free_host_port() {
  local port="$1"
  local ids
  ids="$(docker ps -q --filter "publish=${port}" 2>/dev/null || true)"
  if [[ -n "$ids" ]]; then
    echo "==> free host port ${port} (stop/remove: ${ids//$'\n'/ })"
    docker stop ${ids} 2>/dev/null || true
    docker rm -f ${ids} 2>/dev/null || true
  fi
}

# Fixed container_name values from docker-compose.yml
stop_named_stack_containers() {
  local names=(toshacity-frontend toshacity-backend)
  for name in "${names[@]}"; do
    if docker ps -aq -f "name=^${name}$" 2>/dev/null | grep -q .; then
      echo "==> remove container ${name}"
      docker rm -f "$name" 2>/dev/null || true
    fi
  done
}

DOWN_ARGS=(--remove-orphans)
[[ "${FRESH_DB:-0}" == "1" ]] && DOWN_ARGS+=(-v)

if [[ "${FRESH_DB:-0}" == "1" ]]; then
  echo "==> compose stop + down (removing volumes)"
else
  echo "==> compose stop + down"
fi

# Stop running services first so ports are released before rm/down.
"${DC[@]}" stop 2>/dev/null || true
"${DC[@]}" down "${DOWN_ARGS[@]}" || {
  echo "    compose down reported an error; continuing with forced cleanup…" >&2
}

stop_named_stack_containers

echo "==> free host ports ${API_PORT}, ${WEB_PORT}, ${DB_PORT}"
free_host_port "$API_PORT"
free_host_port "$WEB_PORT"
free_host_port "$DB_PORT"

echo "==> prune stopped containers + dangling images"
docker container prune -f
docker image prune -f

echo "==> compose build"
"${DC[@]}" build

echo "==> start database only"
"${DC[@]}" up -d db

echo "==> wait for Postgres"
for i in $(seq 1 30); do
  if "${DC[@]}" exec -T db sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' &>/dev/null; then
    echo "    db accepting connections"
    break
  fi
  [[ "$i" -eq 30 ]] && { echo "    db not ready"; exit 1; }
  sleep 2
done

if [[ "${FRESH_DB:-0}" != "1" ]]; then
  echo "==> apply SQL migrations from backend/scripts/ (host → docker db, keep data)"
  bash "$ROOT/scripts/run-db-migrations.sh"
else
  echo "==> skip SQL migrations (FRESH_DB=1 — empty database)"
fi

echo "==> start backend + frontend"
"${DC[@]}" up -d

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
api_ok=0
for i in $(seq 1 45); do
  if curl -fsS --max-time 3 "http://127.0.0.1:${API_PORT}/api/health" &>/dev/null; then
    echo "    api ok"
    api_ok=1
    break
  fi
  sleep 2
done

if [[ "$api_ok" -ne 1 ]] && [[ "${FRESH_DB:-0}" != "1" ]]; then
  echo "    api not healthy — re-run migrations (branch backfill) and retry backend once" >&2
  bash "$ROOT/scripts/run-db-migrations.sh"
  "${DC[@]}" restart backend
  for i in $(seq 1 30); do
    if curl -fsS --max-time 3 "http://127.0.0.1:${API_PORT}/api/health" &>/dev/null; then
      echo "    api ok (after migration retry)"
      api_ok=1
      break
    fi
    sleep 2
  done
fi

if [[ "$api_ok" -ne 1 ]]; then
  echo "    api failed" >&2
  "${DC[@]}" logs backend --tail 50
  echo "    Fix without wiping DB: bash scripts/run-db-migrations.sh && docker compose restart backend" >&2
  echo "    If logs show DB password/auth errors, see the note after \"verify DB login\" or use FRESH_DB=1 once." >&2
  exit 1
fi

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
