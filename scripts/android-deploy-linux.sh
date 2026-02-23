#!/bin/bash
set -e

# ── Config ──────────────────────────────────────────────
ANDROID_SDK_PATH="$HOME/Android/Sdk"
CLIENT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ── Parse flags ────────────────────────────────────────
SKIP_BUILD=false
for arg in "$@"; do
    case "$arg" in
        --skip-build) SKIP_BUILD=true ;;
    esac
done

# ── Helpers ─────────────────────────────────────────────
step() { echo ""; echo "── $1 ──────────────────────────────"; }
ok()   { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; exit 1; }

# ── 1. Build client ─────────────────────────────────────
if [ "$SKIP_BUILD" = true ]; then
    step "Build client (skipped)"
    ok "Using existing dist/"
else
    step "Build client"
    cd "$CLIENT_DIR"
    npm run build-only || fail "Vite build failed"
    ok "Build OK"
fi

# ── 2. Capacitor sync ──────────────────────────────────
step "Capacitor sync"
cd "$CLIENT_DIR"
npx cap sync android || fail "cap sync failed"
ok "Capacitor sync OK"

# ── 3. local.properties ────────────────────────────────
step "local.properties"
if [ ! -d "$ANDROID_SDK_PATH" ]; then
    fail "Android SDK introuvable dans $ANDROID_SDK_PATH"
fi
echo "sdk.dir=$ANDROID_SDK_PATH" > "$CLIENT_DIR/android/local.properties"
ok "local.properties configure (sdk.dir=$ANDROID_SDK_PATH)"

# ── 4. Verifications finales ───────────────────────────
step "Verifications finales"

ERRORS=0

if [ -f "$CLIENT_DIR/android/local.properties" ]; then
    ok "local.properties existe"
else
    echo "  ❌ local.properties manquant"; ERRORS=$((ERRORS+1))
fi

if [ -f "$CLIENT_DIR/android/capacitor.settings.gradle" ]; then
    PLUGIN_COUNT=$(grep -c "capacitor" "$CLIENT_DIR/android/capacitor.settings.gradle" || true)
    ok "capacitor.settings.gradle ($PLUGIN_COUNT references)"
else
    echo "  ❌ capacitor.settings.gradle manquant"; ERRORS=$((ERRORS+1))
fi

if [ -d "$CLIENT_DIR/android/app/src/main/assets/public" ]; then
    ok "Assets web synchronises"
else
    echo "  ❌ Assets web manquants dans android/"; ERRORS=$((ERRORS+1))
fi

echo ""
if [ "$ERRORS" -eq 0 ]; then
    echo "🎉 Deploy Android (Linux) termine avec succes !"
    echo "   Ouvre Android Studio : File → Open → $CLIENT_DIR/android"
else
    echo "⚠️  Deploy termine avec $ERRORS erreur(s). Verifie les points ci-dessus."
    exit 1
fi
