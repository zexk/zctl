#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-assets/demo.gif}"
CAST="${OUT%.gif}.cast"
JWT_SECRET="${JWT_SECRET:-dev-secret-change-in-production-1}"
TYPE_SPEED="${TYPE_SPEED:-40}"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "missing dependency: $1" >&2; exit 1; }
}

need asciinema
need pv
need docker
need node
need pnpm

# ── build CLI ─────────────────────────────────────────────────────────────────
echo "→ building CLI..."
pnpm --filter @zctl/cli build

ZCTL="node $REPO_ROOT/apps/cli/dist/index.js"

# ── services ──────────────────────────────────────────────────────────────────
echo "→ starting services..."
docker compose -f "$REPO_ROOT/docker-compose.yml" up -d --build

echo "→ waiting for core..."
STATUS="000"
for i in $(seq 1 60); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/machines 2>/dev/null; true)
  { [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ]; } && break
  sleep 1
done
{ [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ]; } || { echo "core did not start (status $STATUS)"; exit 1; }

# ── operator token (stdlib only) ─────────────────────────────────────────────
OP_TOKEN=$(node --input-type=commonjs <<NODEOF
const { createHmac } = require('node:crypto');
const secret = '$JWT_SECRET';
const h = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const n = Math.floor(Date.now()/1000);
const p = Buffer.from(JSON.stringify({sub:'admin',role:'operator',iat:n,exp:n+3600})).toString('base64url');
const s = createHmac('sha256',secret).update(h+'.'+p).digest('base64url');
process.stdout.write(h+'.'+p+'.'+s);
NODEOF
)

# ── wait for agent ────────────────────────────────────────────────────────────
echo "→ waiting for docker-agent..."
for i in $(seq 1 30); do
  curl -sf http://localhost:3000/machines \
    -H "Authorization: Bearer $OP_TOKEN" 2>/dev/null \
    | grep -q "docker-agent" && break
  sleep 2
done

# ── demo script ───────────────────────────────────────────────────────────────
DEMO_HOME=$(mktemp -d)
DEMO_SCRIPT=$(mktemp)
chmod +x "$DEMO_SCRIPT"
trap 'rm -rf "$DEMO_HOME" "$DEMO_SCRIPT"' EXIT

cat > "$DEMO_SCRIPT" <<EOF
#!/usr/bin/env bash
export HOME="$DEMO_HOME"

type_cmd() {
  printf '%s' "\$1" | pv -qL ${TYPE_SPEED}
  printf '\n'
}

sleep 0.5

type_cmd '$ zctl login --url http://localhost:3000 --token \$OP_TOKEN'
$ZCTL login --url http://localhost:3000 --token "$OP_TOKEN"
printf '\n'
sleep 0.8

type_cmd '$ zctl machines'
$ZCTL machines
printf '\n'
sleep 0.8

type_cmd '$ zctl exec docker-agent uptime'
$ZCTL exec docker-agent uptime
printf '\n'
sleep 0.8

type_cmd '$ zctl exec docker-agent "uname -a"'
$ZCTL exec docker-agent "uname -a"
printf '\n'
sleep 0.8

type_cmd '$ zctl logs docker-agent'
$ZCTL logs docker-agent
printf '\n'
sleep 1.5
EOF

# ── record ────────────────────────────────────────────────────────────────────
echo "→ recording..."
stty cols 90 rows 24 2>/dev/null || true
TERM=xterm-256color asciinema rec \
  --overwrite \
  --idle-time-limit 2 \
  "$CAST" \
  -c "bash $DEMO_SCRIPT"

# ── gif conversion ────────────────────────────────────────────────────────────
if command -v agg >/dev/null 2>&1; then
  echo "→ converting to GIF..."
  agg "$CAST" "$OUT"
  echo "✓ $OUT"
else
  echo "✓ $CAST"
  echo "  to convert to GIF: nix shell nixpkgs#asciinema-agg --command agg $CAST $OUT"
fi
