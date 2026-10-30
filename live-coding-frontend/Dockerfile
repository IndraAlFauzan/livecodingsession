FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_* dibaca saat build dan ditanam ke file JavaScript; mengubahnya membutuhkan build ulang.
ARG VITE_WS_URL
ARG VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL \
    VITE_API_URL=$VITE_API_URL

# Tanpa VITE_WS_URL, src/config.js diam-diam jatuh ke ws://localhost:3000:
# build sukses, container sehat, tapi mahasiswa tidak pernah tersambung.
# Lebih baik build-nya gagal di sini daripada rusaknya baru ketahuan di kelas.
RUN test -n "$VITE_WS_URL" || { \
      echo "GAGAL: VITE_WS_URL wajib diisi saat build image frontend." >&2; \
      echo "       Di Coolify: isi build variable VITE_WS_URL dan VITE_API_URL." >&2; \
      exit 1; \
    }

RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
