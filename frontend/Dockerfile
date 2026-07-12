# =========================
# Stage 1 - Install Dependencies
# =========================
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci

# =========================
# Stage 2 - Build
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# =========================
# Stage 3 - Production
# =========================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup -g 1001 -S nodejs \
 && adduser -S nextjs -u 1001

# Standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy public folder only if your project has one
# (Uncomment if public exists)
# COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
CMD wget --spider -q http://127.0.0.1:3000 || exit 1

CMD ["node", "server.js"]