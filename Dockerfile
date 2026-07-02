# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production ────────────────────────────────────────────────────────
FROM node:22-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV HUSKY=0
ENV CI=true

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/dist ./dist

RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

USER nodejs

EXPOSE 3100

# Run pending migrations then start the app.
# typeorm is in production dependencies so node_modules/typeorm/cli.js is available.
CMD ["sh", "-c", "node node_modules/typeorm/cli.js migration:run -d dist/config/database.config.js && node dist/main"]
