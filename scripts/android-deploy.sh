#!/bin/bash
set -e

# ── Config ──────────────────────────────────────────────
WINDOWS_PROJECT="/mnt/c/Users/patri/AndroidProjects/mtg-commander"
WINDOWS_SHARED_MODULES="/mnt/c/Users/patri/AndroidProjects/mtg-shared-node_modules"
SDK_DIR='sdk.dir=C\:\\Users\\patri\\AppData\\Local\\Android\\Sdk'
CLIENT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ── Parse flags ────────────────────────────────────────
SYNC_MODULES=false
SKIP_BUILD=false
for arg in "$@"; do
    case "$arg" in
        --sync-modules) SYNC_MODULES=true ;;
        --skip-build)   SKIP_BUILD=true ;;
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

# ── 3. Sync shared node_modules (use --sync-modules) ───
# Auto-sync on first deploy if shared modules don't exist
if [ ! -d "$WINDOWS_SHARED_MODULES" ]; then
    echo "  📦 Premier deploy : node_modules sera synchronise automatiquement"
    SYNC_MODULES=true
fi

if [ "$SYNC_MODULES" = true ]; then
    step "Sync shared node_modules"
    if [ -d "$WINDOWS_SHARED_MODULES" ]; then
        echo "  Suppression de l'ancien shared-node_modules..."
        rm -rf "$WINDOWS_SHARED_MODULES"
    fi
    echo "  Copie de node_modules vers Windows (peut prendre ~1min)..."
    cp -r "$CLIENT_DIR/node_modules" "$WINDOWS_SHARED_MODULES" || fail "cp node_modules failed"
    ok "shared-node_modules synchronise"
else
    echo "  ⏭️  node_modules skip (use --sync-modules pour forcer)"
fi

# ── 4. Copy project to Windows (clean slate) ───────────
step "Copy project to Windows"
if [ -d "$WINDOWS_PROJECT" ]; then
    echo "  Suppression de l'ancien dossier projet..."
    rm -rf "$WINDOWS_PROJECT"
fi
mkdir -p "$WINDOWS_PROJECT"
rsync -a --exclude='node_modules' "$CLIENT_DIR/" "$WINDOWS_PROJECT/" || fail "rsync failed"
ok "Projet copie (sans node_modules)"

# ── 5. Create junction for node_modules ────────────────
step "Junction node_modules"
cmd.exe /c "cd /d C:\\Users\\patri\\AndroidProjects\\mtg-commander && mklink /J node_modules ..\\mtg-shared-node_modules" 2>/dev/null || true
# Verify junction exists
if [ -d "$WINDOWS_PROJECT/node_modules/@capacitor" ]; then
    ok "Junction creee et fonctionnelle"
else
    fail "Junction node_modules ne fonctionne pas"
fi

# ── 6. Restore local.properties ────────────────────────
step "local.properties"
echo "$SDK_DIR" > "$WINDOWS_PROJECT/android/local.properties"
ok "local.properties restaure"

# ── 7. Verification ───────────────────────────────────
step "Verifications finales"

ERRORS=0

# Check local.properties
if [ -f "$WINDOWS_PROJECT/android/local.properties" ]; then
    ok "local.properties existe"
else
    echo "  ❌ local.properties manquant"; ERRORS=$((ERRORS+1))
fi

# Check capacitor.settings.gradle
if [ -f "$WINDOWS_PROJECT/android/capacitor.settings.gradle" ]; then
    PLUGIN_COUNT=$(grep -c "capacitor" "$WINDOWS_PROJECT/android/capacitor.settings.gradle" || true)
    ok "capacitor.settings.gradle ($PLUGIN_COUNT references)"
else
    echo "  ❌ capacitor.settings.gradle manquant"; ERRORS=$((ERRORS+1))
fi

# Check all Capacitor plugins have android/ dirs
MISSING_ANDROID=""
for PLUGIN_DIR in "$WINDOWS_PROJECT/node_modules/@capacitor"/*/; do
    PLUGIN_NAME=$(basename "$PLUGIN_DIR")
    if [ "$PLUGIN_NAME" = "cli" ] || [ "$PLUGIN_NAME" = "core" ] || [ "$PLUGIN_NAME" = "ios" ]; then
        continue
    fi
    if [ -d "$PLUGIN_DIR/android" ]; then
        continue
    fi
    if grep -q "$PLUGIN_NAME" "$WINDOWS_PROJECT/android/capacitor.settings.gradle" 2>/dev/null; then
        MISSING_ANDROID="$MISSING_ANDROID $PLUGIN_NAME"
    fi
done

if [ -z "$MISSING_ANDROID" ]; then
    ok "Tous les plugins Capacitor ont leur code Android natif"
else
    echo "  ❌ Plugins sans android/:$MISSING_ANDROID"; ERRORS=$((ERRORS+1))
fi

# Summary
echo ""
if [ "$ERRORS" -eq 0 ]; then
    echo "🎉 Deploy Android termine avec succes !"
    echo "   Ouvre Android Studio : File → Sync Project with Gradle Files → Run"
else
    echo "⚠️  Deploy termine avec $ERRORS erreur(s). Verifie les points ci-dessus."
    exit 1
fi
