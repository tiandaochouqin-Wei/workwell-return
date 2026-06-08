# WorkWell Return — single image that serves the SPA + REST API + WebSocket.
FROM node:24-alpine
WORKDIR /app

# Install backend deps first (better layer caching). node:sqlite is built in.
COPY server/package.json ./server/
RUN cd server && npm install --omit=dev

# App (frontend + backend). node_modules / data.db excluded via .dockerignore.
COPY . .

RUN mkdir -p /data
ENV PORT=8787 STATIC_DIR=/app DB_PATH=/data/data.db
EXPOSE 8787
WORKDIR /app/server
CMD ["node", "server.js"]
