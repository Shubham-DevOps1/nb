#!/bin/bash
# CodeDeploy ValidateService hook - confirms the new deployment actually came
# up healthy before CodeDeploy marks it successful. Retries because the
# backend loads its embedding model at startup, which takes real time (a few
# seconds locally; budget more headroom here for a smaller EC2 instance).
set -e

MAX_ATTEMPTS=20
SLEEP_SECONDS=5

# nginx (frontend, port 80) proxies /health straight through to backend-ai's
# own /health route (see nginx.conf) - one check through the public port
# confirms both the frontend container and the backend behind it are up.
for i in $(seq 1 $MAX_ATTEMPTS); do
  if curl -sf http://localhost/health > /dev/null; then
    echo "Deployment validated (attempt $i)."
    exit 0
  fi
  echo "Not healthy yet (attempt $i/$MAX_ATTEMPTS), waiting ${SLEEP_SECONDS}s..."
  sleep $SLEEP_SECONDS
done

echo "ERROR: service did not become healthy after $((MAX_ATTEMPTS * SLEEP_SECONDS))s." >&2
docker compose -f /home/ec2-user/talentiq/docker-compose.deploy.yml logs --tail=50
exit 1
