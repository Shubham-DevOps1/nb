#!/bin/bash
# CodeDeploy ApplicationStop hook. Runs BEFORE the new revision's files are
# copied onto the instance, so it must not depend on anything from the new
# deployment - only on what's already on disk from the previous one.
set -e

APP_DIR="/home/ec2-user/talentiq"

if [ -f "$APP_DIR/docker-compose.deploy.yml" ]; then
  echo "Stopping existing TalentIQ containers..."
  cd "$APP_DIR"
  docker compose -f docker-compose.deploy.yml down || true
else
  echo "No existing deployment found - nothing to stop (first deploy)."
fi
