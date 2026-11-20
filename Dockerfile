# L5-03 (R-01, R-02, D-18, D-19): one image serves the API and the built UI on $PORT. Three stages, Node 24.
# No secret is baked in: DATABASE_URL, SEED_PASSWORD and the rest arrive as environment variables at run time.

# 1. Build the UI to client/dist.
FROM node:24-bookworm-slim AS client-build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci -w client --ignore-scripts
COPY client/ client/
RUN npm run build -w client

# 2. Install the server dependencies and compile the API. prisma and tsx stay: the migration and seed:demo steps need them.
FROM node:24-bookworm-slim AS server-build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
COPY server/prisma server/prisma
RUN npm ci -w server
COPY server/ server/
RUN npm run build -w server

# 3. Runtime: no build tools, runs as the unprivileged user node.
FROM node:24-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=3000 CLIENT_DIST=/app/client/dist
WORKDIR /app
COPY --from=server-build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=server-build --chown=node:node /app/node_modules node_modules
COPY --from=server-build --chown=node:node /app/server/package.json server/package.json
COPY --from=server-build --chown=node:node /app/server/prisma server/prisma
COPY --from=server-build --chown=node:node /app/server/dist server/dist
COPY --from=client-build --chown=node:node /app/client/dist client/dist
USER node
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
