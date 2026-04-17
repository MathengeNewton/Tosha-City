#!/usr/bin/env bash
# Run from repo root: bash scripts/laketown-docker-restart.sh
# Brings the stack down, removes built app images, prunes dangling images, then rebuilds
# (no cache) and starts. Also stops any *other* containers publishing host ports 5432, 4515, 3015.
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

echo "==> Removing LakeTown app images (backend / frontend)"
docker rmi -f laketown-backend:latest laketown-frontend:latest 2>/dev/null || true

echo "==> Pruning dangling images (unused layers)"
docker image prune -f

echo "==> docker compose build --no-cache"
docker compose build --no-cache

echo "==> docker compose up -d"
docker compose up -d

echo "==> docker compose ps"
docker compose ps
