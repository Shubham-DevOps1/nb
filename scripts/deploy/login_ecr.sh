#!/bin/bash
# CodeDeploy AfterInstall hook. Runs after the new revision's files (incl.
# docker-compose.deploy.yml, which references ECR image URIs) have been
# copied to the instance. Logs in to ECR so ApplicationStart can pull them -
# relies on the instance's IAM role (see ec2-stack.yaml) having ECR pull
# permissions, not on any stored credentials.
set -e

REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
