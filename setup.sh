#!/bin/bash

err() {
  echo -e "\n[$(date +'%Y-%m-%dT%H:%M:%S%z')]: ${*}\n" >&2
  exit 1
}

log() {
  echo -e "\n[$(date +'%Y-%m-%dT%H:%M:%S%z')]: ${*}\n"
}

if ! type "docker" >/dev/null 2>&1; then
  err "Docker not installed"
fi

if ! docker compose version >/dev/null 2>&1; then
  err "Docker Compose not installed"
fi

if ! type "node" >/dev/null 2>&1; then
  err "NodeJS not installed"
fi

if ! type "npm" >/dev/null 2>&1; then
  err "NPM not installed"
fi

log "Docker, Node, and NPM found."

if [ ! -f ".env" ]; then
  log "Copying .env.example -> .env"
  cp .env.example .env || err "Could not copy .env.example"
else
  log ".env already exists, skipping copy."
fi

log "Installing dependencies"
npm install --ignore-scripts || err "npm install failed"

log "Starting database container"
docker compose up -d database || err "Docker Compose failed"

log "Waiting for database to be ready..."
for i in $(seq 1 15); do
  docker exec app_postgres_dev pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 2
done

log "Running migrations"
npm run migration:run || err "Migrations failed"

log "Setup completed. Run 'npm run start:dev' to start the server."
