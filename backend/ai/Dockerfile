# TalentIQ AI backend service - Node/Express API, local BGE embeddings,
# Gemini RAG. Talks to a separate ChromaDB container over CHROMA_URL - it
# does not bundle Chroma itself.
#
# IMPORTANT: build context must be the REPO ROOT, not backend/ai - e.g.
#   docker build -f backend/ai/Dockerfile .
# rankingEngine.js and requirementExtractor.js reach outside backend/ai via
# require('../../generator/master/...') into backend/generator/master/ (the
# skills/domains/certifications taxonomy). Mirroring the real repo layout
# inside the image (backend/ai/ and backend/generator/master/ as siblings)
# lets those relative requires resolve unchanged - a backend/ai-only build
# context was tried first and crash-looped on MODULE_NOT_FOUND.
FROM node:20-slim

WORKDIR /app/backend/ai

# Install dependencies first so this layer is cached across code-only changes.
COPY backend/ai/package.json backend/ai/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/ai/ ./
COPY backend/generator/master/ /app/backend/generator/master/

# Re-ingestion (ingestion/ingestKnowledgeCards.js) and skill-gap analysis
# (skillGap/skillGapAnalyzer.js) read these at runtime via fileLoader.js, not
# just at a one-off seeding step - bake them in so the container is
# self-sufficient without the full repo being shipped to the instance (see
# buildspec.yml/.dockerignore for what actually ships).
COPY backend/generator/output/employees.json backend/generator/output/knowledgeCards.json backend/generator/output/projects.json /app/backend/generator/output/

# data/ holds runtime-written employee/resume records - mount a volume here
# in docker-compose/ECS so it survives container restarts and redeploys.
RUN mkdir -p data/employees data/uploads

ENV PORT=3456
EXPOSE 3456

# No built-in healthcheck dependency needed - /health is a plain route.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3456)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "api/server.js"]
