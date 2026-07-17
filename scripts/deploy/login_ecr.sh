#!/bin/bash
# CodeDeploy AfterInstall hook. Runs after the new revision's files (incl.
# docker-compose.deploy.yml, which references ECR image URIs) have been
# copied to the instance. Logs in to ECR so ApplicationStart can pull them -
# relies on the instance's IAM role (see ec2-stack.yaml) having ECR pull
# permissions, not on any stored credentials.
set -e

# Amazon Linux 2023 requires IMDSv2 (token-based) - a plain unauthenticated
# metadata GET silently returns empty rather than erroring, which produced a
# malformed "api.ecr..amazonaws.com" endpoint (empty $REGION) on first deploy.
IMDS_TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
REGION=$(curl -s -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" http://169.254.169.254/latest/meta-data/placement/region)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
