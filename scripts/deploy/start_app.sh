#!/bin/bash
# CodeDeploy ApplicationStart hook.
set -e

APP_DIR="/home/ec2-user/talentiq"
cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "ERROR: $APP_DIR/.env is missing (GEMINI_API_KEY etc). This file is" \
       "created once manually on the instance, outside the deployment" \
       "pipeline, since secrets don't belong in the CodeCommit repo." >&2
  exit 1
fi

echo "Pulling latest images..."
docker compose -f docker-compose.deploy.yml --env-file .env pull

echo "Starting TalentIQ containers..."
docker compose -f docker-compose.deploy.yml --env-file .env up -d

echo "Pruning old, now-unreferenced images to keep disk usage bounded..."
docker image prune -f
