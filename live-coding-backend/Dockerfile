# node:sqlite tanpa flag membutuhkan Node >= 22.13.
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/app/data/livecoding.db

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

# Izin file sumber bisa terbawa ketat (mis. 700) dari mesin build; kode tetap milik root dan read-only bagi user node.
RUN chmod -R a+rX /app/src /app/package.json /app/package-lock.json

# Named volume baru mewarisi kepemilikan folder ini, sehingga user "node" bisa menulis database.
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/index.js"]
