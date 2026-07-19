# cortexchat — single-image build of the whole monorepo.
#
# Deliberately ships the full workspace (source + node_modules) rather than
# Next's minimal "standalone" trace output: this app reads config/models.yaml
# and packages/db/drizzle/*.sql at runtime, which Next's dependency tracer
# doesn't know about since they're never `import`-ed as JS. The full-monorepo
# image is a few hundred MB heavier but is guaranteed correct, which matters
# more for a self-hosted single-user app than shaving image size.
#
# Both stages use the same Debian base (not Alpine/musl) because
# better-sqlite3 ships a compiled native addon — mixing libc flavors between
# the build and run stage silently breaks the binary at runtime.

FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @cortexchat/core --filter @cortexchat/providers --filter @cortexchat/db --filter @cortexchat/memory run build
RUN pnpm --filter @cortexchat/web run build
# Drop devDependencies (typescript, vitest, eslint, drizzle-kit, ...) now that
# every package is already compiled to dist/ — they add nothing at runtime.
RUN pnpm prune --prod

FROM base AS runner
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/cortexchat.sqlite
ENV DB_MIGRATIONS_DIR=/app/packages/db/drizzle
ENV MODEL_REGISTRY_PATH=/app/config/models.yaml
ENV PORT=3000

RUN groupadd --system cortexchat && useradd --system --gid cortexchat --create-home cortexchat
COPY --from=builder /app /app
RUN mkdir -p /app/data && chown -R cortexchat:cortexchat /app

USER cortexchat
WORKDIR /app/apps/web
EXPOSE 3000
VOLUME ["/app/data"]

CMD ["pnpm", "start", "--", "-p", "3000"]
