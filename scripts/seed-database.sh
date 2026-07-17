#!/bin/bash
# One-time RDS seed loader. Deliberately NOT part of the CI/CD pipeline -
# backend/generator/output/seed.sql starts with `DROP TABLE ... CASCADE`,
# so re-running this after the database has any real data in it would
# destroy it. Run this by hand, once, right after rds-stack.yaml first
# creates the database.
#
# Must run from somewhere with network access to the RDS endpoint - that
# means the EC2 app server (it's in the same VPC; RDS is not publicly
# accessible), not your own laptop, unless you've set up a bastion/VPN.
#
# Usage:
#   ./seed-database.sh <rds-endpoint> <master-user-secret-arn> [db-name]
set -euo pipefail

ENDPOINT="${1:?Usage: $0 <rds-endpoint> <master-user-secret-arn> [db-name]}"
SECRET_ARN="${2:?Usage: $0 <rds-endpoint> <master-user-secret-arn> [db-name]}"
DB_NAME="${3:-talentiq}"
SEED_FILE="$(dirname "$0")/../backend/generator/output/seed.sql"

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql not found. On the EC2 instance (Amazon Linux 2023): sudo dnf install -y postgresql16" >&2
  exit 1
fi

if [ ! -f "$SEED_FILE" ]; then
  echo "ERROR: $SEED_FILE not found. Make sure the repo (with backend/generator/output/ committed) is checked out here." >&2
  exit 1
fi

echo "Fetching master password from Secrets Manager (not printed)..."
SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id "$SECRET_ARN" --query SecretString --output text)
DB_PASSWORD=$(node -e "console.log(JSON.parse(process.argv[1]).password)" "$SECRET_JSON")
DB_USER=$(node -e "console.log(JSON.parse(process.argv[1]).username)" "$SECRET_JSON")
unset SECRET_JSON

echo "Loading $SEED_FILE into ${DB_NAME}@${ENDPOINT} as ${DB_USER}..."
echo "WARNING: this DROPS and recreates every table defined in seed.sql."
read -r -p "Type 'yes' to continue: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

PGPASSWORD="$DB_PASSWORD" psql -h "$ENDPOINT" -U "$DB_USER" -d "$DB_NAME" -f "$SEED_FILE"

echo "Done. Row counts:"
PGPASSWORD="$DB_PASSWORD" psql -h "$ENDPOINT" -U "$DB_USER" -d "$DB_NAME" -c "
  SELECT 'employees' AS table_name, COUNT(*) FROM employees
  UNION ALL SELECT 'projects', COUNT(*) FROM projects
  UNION ALL SELECT 'employee_skills', COUNT(*) FROM employee_skills
  UNION ALL SELECT 'employee_projects', COUNT(*) FROM employee_projects
  UNION ALL SELECT 'employee_certifications', COUNT(*) FROM employee_certifications;
"
unset DB_PASSWORD
