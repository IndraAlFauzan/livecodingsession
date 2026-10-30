#!/usr/bin/env bash
# Menjalankan pemeriksaan yang sama dengan .github/workflows/ci.yml, tapi lokal.
# Dipakai selagi GitHub Actions belum bisa jalan, atau untuk memeriksa sebelum push.
#
#   ./scripts/check.sh
#
# Keluar dengan kode 1 kalau ada yang gagal. Tidak menyentuh database dev:
# backend diuji di port lain dengan database sementara.

set -uo pipefail
cd "$(dirname "$0")/.."

PORT_UJI=3999
DB_UJI="$(mktemp -d)/check.db"
TOKEN_UJI=token-pemeriksaan
gagal=()

judul() { printf '\n\033[1m%s\033[0m\n' "$1"; }
lolos()  { printf '  \033[32mok\033[0m    %s\n' "$1"; }
tidak()  { printf '  \033[31mGAGAL\033[0m %s\n' "$1"; gagal+=("$1"); }

# ---------- lockfile sinkron (yang dicek `npm ci` di CI) ----------
judul "Lockfile"
for d in live-coding-frontend live-coding-backend live-coding-classroom; do
  if node -e "
    const p=require('./$d/package.json'), l=require('./$d/package-lock.json').packages[''];
    const sisa=[...new Set([
      ...Object.keys(p.dependencies||{}), ...Object.keys(p.devDependencies||{})
    ])].filter(k => !((l.dependencies||{})[k] || (l.devDependencies||{})[k]));
    if (sisa.length) { console.error(sisa.join(', ')); process.exit(1); }
  " 2>/dev/null; then lolos "$d"; else tidak "$d: package.json dan lockfile tidak cocok (jalankan npm install)"; fi
done

# ---------- frontend ----------
judul "Frontend"
(cd live-coding-frontend && npm run lint >/dev/null 2>&1) && lolos "lint" || tidak "frontend lint"
(cd live-coding-frontend && npm run build >/dev/null 2>&1) && lolos "build" || tidak "frontend build"

# ---------- backend ----------
judul "Backend"
(
  cd live-coding-backend
  TEACHER_TOKEN="$TOKEN_UJI" PORT="$PORT_UJI" DB_PATH="$DB_UJI" \
    PUBLIC_BASE_URL=http://localhost:5174 node src/index.js > /tmp/check-backend.log 2>&1 &
  server=$!
  trap 'kill "$server" 2>/dev/null || true' EXIT
  siap() { curl -sf --connect-timeout 2 --max-time 5 "http://localhost:$PORT_UJI/health" >/dev/null; }
  for _ in $(seq 1 30); do siap && break; sleep 1; done
  siap || { echo "server tidak siap"; cat /tmp/check-backend.log; exit 1; }
  BACKEND_URL="http://localhost:$PORT_UJI" TEACHER_TOKEN="$TOKEN_UJI" npm test > /tmp/check-smoke.log 2>&1
) && lolos "smoke test (35 pengecekan)" || { tidak "backend smoke test"; tail -5 /tmp/check-smoke.log 2>/dev/null | sed 's/^/        /'; }

# ---------- extension ----------
judul "Extension"
(cd live-coding-classroom && npm run compile >/dev/null 2>&1) && lolos "compile" || tidak "extension compile"

# ---------- ringkasan ----------
if [ ${#gagal[@]} -eq 0 ]; then
  printf '\n\033[32mSemua pemeriksaan lulus.\033[0m Aman untuk push.\n\n'
else
  printf '\n\033[31m%d pemeriksaan gagal:\033[0m\n' "${#gagal[@]}"
  printf '  - %s\n' "${gagal[@]}"
  printf '\n'
  exit 1
fi
