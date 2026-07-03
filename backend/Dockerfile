# Build Stage
FROM node:20-bookworm-slim AS builder
WORKDIR /usr/src/app

RUN apt-get update -y && apt-get install -y openssl ca-certificates

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
RUN npm ci

COPY . .
RUN npx prisma generate --schema=./backend/prisma/schema.prisma
RUN npm run build --workspace=backend

# Production Stage
FROM node:20-bookworm-slim
WORKDIR /usr/src/app

RUN apt-get update -y && apt-get install -y openssl ca-certificates

COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/backend/dist ./backend/dist
COPY --from=builder /usr/src/app/backend/prisma ./backend/prisma
COPY --from=builder /usr/src/app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 5000
ENV NODE_ENV=production
WORKDIR /usr/src/app/backend
CMD ["sh", "-c", "npx prisma db push && npm start"]
