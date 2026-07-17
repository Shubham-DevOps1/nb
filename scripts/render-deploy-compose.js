#!/usr/bin/env node
/**
 * Generates docker-compose.deploy.yml from the ECR registry/repo/tag CodeBuild
 * just pushed. Deliberately a hand-written template rather than a
 * transform-in-place of docker-compose.yml (which uses `build:` for local
 * dev) - this file uses `image:` so the EC2 instance pulls pre-built images
 * instead of rebuilding from source, and no YAML-parsing dependency is
 * needed for something this small and fixed-shape.
 *
 * Usage: node render-deploy-compose.js <registry> <backendRepo> <frontendRepo> <tag>
 */
const fs = require('fs');
const path = require('path');

const [, , registry, backendRepo, frontendRepo, tag] = process.argv;

if (!registry || !backendRepo || !frontendRepo || !tag) {
  console.error('Usage: render-deploy-compose.js <registry> <backendRepo> <frontendRepo> <tag>');
  process.exit(1);
}

const content = `name: talentiq

services:
  chroma:
    image: chromadb/chroma:latest
    restart: unless-stopped
    volumes:
      - chroma-data:/chroma/chroma
    networks:
      - talentiq-net

  backend-ai:
    image: ${registry}/${backendRepo}:${tag}
    restart: unless-stopped
    depends_on:
      - chroma
    environment:
      CHROMA_URL: http://chroma:8000
      PORT: 3456
      GEMINI_API_KEY: \${GEMINI_API_KEY}
      GEMINI_MODEL: \${GEMINI_MODEL:-}
    volumes:
      - backend-data:/app/data
    networks:
      - talentiq-net

  frontend:
    image: ${registry}/${frontendRepo}:${tag}
    restart: unless-stopped
    depends_on:
      - backend-ai
    ports:
      - "80:80"
    networks:
      - talentiq-net

volumes:
  chroma-data:
  backend-data:

networks:
  talentiq-net:
    driver: bridge
`;

const outPath = path.join(__dirname, '..', 'docker-compose.deploy.yml');
fs.writeFileSync(outPath, content);
console.log('Wrote', outPath);
