# ---- DocVerify production image (Render / Coolify / any Docker host) ----
# Build context = docV/ (this folder holds server.js + package.json).
FROM node:20-bookworm-slim

# System deps: build native addons (bcrypt) + outbound HTTPS CA certs.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install production deps first (better layer caching).
# .npmrc sets legacy-peer-deps=true to avoid a React 18/19 peer conflict.
COPY package.json .npmrc ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy the rest of the app.
COPY . .
RUN chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

USER node
CMD ["node", "server.js"]
