#!/usr/bin/env bash
# Run from repo root: bash scripts/laketown-docker-restart.sh
# Stops this project's stack, stops any other container still bound to host :5432, then starts again.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> docker compose down (laketown)"
docker compose down --remove-orphans 2>/dev/null || true

echo "==> Stopping containers that publish host port 5432"
for cid in $(docker ps -q); do
  if docker port "$cid" 2>/dev/null | grep -qE '0\.0\.0\.0:5432|:::5432'; then
    echo "    docker stop $cid ($(docker inspect -f '{{.Name}}' "$cid"))"
    docker stop "$cid" || true
  fi
done

echo "==> docker compose up -d --build"
docker compose up -d --build

echo "==> docker compose ps"
docker compose ps
