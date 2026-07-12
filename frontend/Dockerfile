# =====================================================
# Stage 1 - Dependencies
# =====================================================
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

# =====================================================
# Stage 2 - Builder
# =====================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ---------- Build Arguments ----------
ARG NODE_ENV=production
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# ---------- Make them available during build ----------
ENV NODE_ENV=${NODE_ENV}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}

# Build Next.js
RUN npm run build

# =====================================================
# Stage 3 - Production
# =====================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Runtime environment variables
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_SOCKET_URL=""
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""

RUN addgroup -S nodejs -g 1001 \
 && adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Uncomment if your project has a public folder
# COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
CMD wget --spider -q http://127.0.0.1:3000 || exit 1

CMD ["node", "server.js"]