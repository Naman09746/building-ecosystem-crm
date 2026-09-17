# ============================================================================
# Ecosystem Realty — Production Image (multi-stage, standalone output)
# Build:  docker build -t ecosystemrealty:latest .
# Run:    docker run -p 3000:3000 --env-file .env.production ecosystemrealty:latest
# ============================================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ---- Dependencies (cached layer) ----
FROM base AS deps
COPY package.json yarn.lock ./
COPY apps/real-estate/package.json ./apps/real-estate/
COPY packages/core/package.json ./packages/core/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config-typescript/package.json ./packages/config-typescript/
COPY packages/config-eslint/package.json ./packages/config-eslint/
COPY packages/config-tailwind/package.json ./packages/config-tailwind/
RUN yarn install --frozen-lockfile

# ---- Build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public env vars are needed at BUILD time; secrets are injected at RUNTIME.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_TELEMETRY_DISABLED=1

RUN yarn build --filter=real-estate-app...

# ---- Runtime (minimal, non-root) ----
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat curl \
 && addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Standalone server + static assets + public files only — no source, no node_modules
COPY --from=builder /app/apps/real-estate/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/real-estate/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/real-estate/.next/static ./apps/real-estate/.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "apps/real-estate/server.js"]
