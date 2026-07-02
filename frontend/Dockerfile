# Build Stage
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
RUN npm ci

COPY . .
RUN npm run build --workspace=frontend

# Production Stage
FROM nginx:alpine
COPY --from=builder /usr/src/app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
