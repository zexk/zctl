FROM node:25-slim AS build
WORKDIR /app
RUN npm install -g pnpm@10

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:25-alpine
WORKDIR /app

COPY --from=build /app/apps/core/dist /app/dist
COPY --from=build /app/apps/core/drizzle /app/drizzle
COPY --from=build /app/apps/core/drizzle.config.ts /app/
COPY --from=build /app/packages /app/packages
COPY --from=build /app/node_modules /app/node_modules

RUN for pkg in /app/node_modules/.pnpm/node_modules/*; do \
      name=$(basename "$pkg"); \
      target="/app/node_modules/$name"; \
      [ ! -e "$target" ] && ln -s "$pkg" "$target"; \
    done

USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD node_modules/.pnpm/node_modules/.bin/drizzle-kit migrate && node dist/index.js
