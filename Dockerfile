# syntax=docker/dockerfile:1
# Multi-stage Next.js (standalone) build — minimal production image.

# 1) Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: skip postinstall (`prisma generate`) — at this stage
# prisma/schema.prisma doesn't exist yet, so generation would fail. The client is
# generated in the builder stage below.
RUN npm ci --ignore-scripts

# 2) Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Generate the Prisma Client from the schema BEFORE next build. The deps stage runs
# `npm ci` without prisma/schema.prisma, so Prisma's postinstall hook doesn't fire
# there and `@prisma/client` stays empty (#247 added the Postgres layer; in memory
# mode the client is also imported at build time). Without this, `next build` fails.
RUN npx prisma generate
RUN npm run build

# 3) Runtime — only what's needed to run
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Listen on all interfaces (otherwise the reverse proxy in the sibling container
# can't reach it).
ENV HOSTNAME=0.0.0.0

# Unprivileged user.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Healthcheck via the existing /api/health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
