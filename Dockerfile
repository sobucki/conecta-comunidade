FROM node:24.22.3-alpine AS operations
RUN apk add --no-cache docker-cli docker-cli-compose
ENTRYPOINT ["node"]

FROM node:24.22.3-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY next.config.ts tsconfig.json ./
COPY src ./src
# Valores fictícios apenas para importar a configuração no build, sem conexão ao banco.
RUN NODE_ENV=production PAYLOAD_SECRET=build-only-placeholder-never-use-at-runtime DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build APP_URL=https://build.invalid npm run build

FROM node:24.22.3-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0
# Manter CLI, fontes e tsx para executar as migrações da mesma versão da aplicação.
COPY --from=build --chown=node:node /app ./
COPY --chown=node:node scripts ./scripts
RUN mkdir -p /app/media && chown node:node /app/media
USER node
EXPOSE 3000
CMD ["sh", "-c", "node scripts/deploy/check.mjs && exec node node_modules/next/dist/bin/next start --hostname 0.0.0.0"]
