#!/usr/bin/env bash
# Run from repo root: bash scripts/laketown-docker-restart.sh
# Stops this project's stack, then stops any *other* running containers that still publish
# common host ports used by this stack (5432, 4515, 3015). Then docker compose up --build.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> docker compose down (laketown)"
docker compose down --remove-orphans 2>/dev/null || true

stop_containers_on_host_port() {
  local port=$1
  for cid in $(docker ps -q); do
    if docker port "$cid" 2>/dev/null | grep -qE "0\.0\.0\.0:${port}|:::${port}|\[::\]:${port}"; then
      echo "    docker stop $cid ($(docker inspect -f '{{.Name}}' "$cid")) — host :${port}"
      docker stop "$cid" || true
    fi
  done
}

echo "==> Stopping other containers that publish host ports 5432, 4515, 3015"
for p in 5432 4515 3015; do
  stop_containers_on_host_port "$p"
done

echo "==> docker compose up -d --build"
docker compose up -d --build

echo "==> docker compose ps"
docker compose ps
