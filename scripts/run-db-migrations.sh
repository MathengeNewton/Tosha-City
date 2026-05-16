#!/usr/bin/env bash
# Apply SQL migrations to the Postgres container without wiping data.
# SQL files live on the HOST at backend/scripts/*.sql (repo source of truth) and are
# piped into: docker compose exec -T db psql ...
#
# Run while db is up and backend is stopped (restart.sh does this automatically).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
ENV_FILE="${ENV_FILE:-.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

DB_USER="${DATABASE_USER:-toshacity}"
DB_NAME="${DATABASE_NAME:-toshacity_butchery}"

if docker compose version &>/dev/null; then
  DC=(docker compose -f "$COMPOSE_FILE")
elif command -v docker-compose &>/dev/null; then
  DC=(docker-compose -f "$COMPOSE_FILE")
else
  echo "Need Docker Compose" >&2
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  DC+=(--env-file "$ENV_FILE")
fi

MIGRATION_DIR="${MIGRATION_DIR:-$ROOT/backend/scripts}"

if [[ ! -d "$MIGRATION_DIR" ]]; then
  echo "No migration directory: $MIGRATION_DIR" >&2
  exit 1
fi

if ! "${DC[@]}" ps --status running 2>/dev/null | grep -q db; then
  echo "Database container is not running. Start it first: docker compose up -d db" >&2
  exit 1
fi

shopt -s nullglob
files=("$MIGRATION_DIR"/*.sql)
shopt -u nullglob

if [[ ${#files[@]} -eq 0 ]]; then
  echo "No .sql files in $MIGRATION_DIR"
  exit 0
fi

IFS=$'\n' files=($(printf '%s\n' "${files[@]}" | sort))
unset IFS

echo "==> apply SQL migrations from $MIGRATION_DIR (${#files[@]} file(s))"

for sql in "${files[@]}"; do
  echo "    → $(basename "$sql")"
  "${DC[@]}" exec -T db psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" < "$sql"
done

echo "    migrations ok"
