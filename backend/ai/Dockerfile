# TalentIQ AI backend service - Node/Express API, local BGE embeddings,
# Gemini RAG. Talks to a separate ChromaDB container over CHROMA_URL - it
# does not bundle Chroma itself.
FROM node:20-slim

WORKDIR /app

# Install dependencies first so this layer is cached across code-only changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# data/ holds runtime-written employee/resume records - mount a volume here
# in docker-compose/ECS so it survives container restarts and redeploys.
RUN mkdir -p data/employees data/uploads

ENV PORT=3456
EXPOSE 3456

# No built-in healthcheck dependency needed - /health is a plain route.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3456)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "api/server.js"]
