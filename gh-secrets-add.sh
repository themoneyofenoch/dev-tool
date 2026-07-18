#!/bin/bash
# gh-secrets-add.sh — Add GitHub Actions secrets to any repo
# Usage: gh-secrets-add.sh <repo> [platform]
#   repo: GitHub repo in format "owner/repo"
#   platform: "ios", "android", or "all" (default: all)
#
# Reads keys from ~/Developer/private_keys/ and adds them as GitHub Secrets.
# Requires: gh CLI authenticated, repo must exist.

set -euo pipefail

REPO="${1:?Usage: gh-secrets-add.sh <owner/repo> [ios|android|all]}"
PLATFORM="${2:-all}"
TOKEN=$(cat ~/Developer/private_keys/github-token.txt)
GH="GH_TOKEN=$TOKEN gh"

echo "🔑 Adding secrets to $REPO (platform: $PLATFORM)..."

add_secret() {
    local name="$1" value="$2"
    GH_TOKEN="$TOKEN" gh secret set "$name" --body "$value" --repo "$REPO" 2>/dev/null
    echo "  ✅ $name"
}

# ── iOS (App Store Connect) ──────────────────────────────────────────────────
if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "all" ]]; then
    echo ""
    echo "📱 iOS secrets..."
    
    P8_FILE=$(ls ~/Developer/private_keys/AuthKey_*.p8 2>/dev/null | head -1)
    if [[ -z "$P8_FILE" ]]; then
        echo "  ⚠️  No AuthKey_*.p8 found in ~/Developer/private_keys/ — skipping iOS"
    else
        P8_BASENAME=$(basename "$P8_FILE" .p8)
        P8_KEY_ID="${P8_BASENAME#AuthKey_}"
        P8_ISSUER="0418454e-4e54-4fc7-a387-b3b2460fd5e8"
        P8_B64=$(base64 < "$P8_FILE")
        
        add_secret "APPLE_API_KEY_ID" "$P8_KEY_ID"
        add_secret "APPLE_API_ISSUER_ID" "$P8_ISSUER"
        add_secret "APPLE_API_KEY" "$P8_B64"
    fi
fi

# ── Android (Google Play + signing) ──────────────────────────────────────────
if [[ "$PLATFORM" == "android" || "$PLATFORM" == "all" ]]; then
    echo ""
    echo "🤖 Android secrets..."
    
    # Google Play service account
    GOOGLE_JSON=$(ls ~/Developer/private_keys/google-play-key.json ~/Developer/private_keys/*google*.json 2>/dev/null | head -1)
    if [[ -n "$GOOGLE_JSON" ]]; then
        GOOGLE_B64=$(base64 < "$GOOGLE_JSON")
        add_secret "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON" "$GOOGLE_B64"
    else
        echo "  ⚠️  No google-play-key.json found — skipping Google Play"
    fi
    
    # Android keystore (auto-generate if missing)
    KEYSTORE_PATH="${ANDROID_KEYSTORE_PATH:-}"
    if [[ -z "$KEYSTORE_PATH" || ! -f "$KEYSTORE_PATH" ]]; then
        # Try common locations
        for candidate in \
            "android/app/release-keystore.jks" \
            "android/app/upload-keystore.jks" \
            "$HOME/Developer/private_keys/$(basename "$REPO").keystore" \
            "$HOME/Developer/private_keys/android-release.jks"; do
            if [[ -f "$candidate" ]]; then
                KEYSTORE_PATH="$candidate"
                break
            fi
        done
    fi
    
    if [[ -z "$KEYSTORE_PATH" || ! -f "$KEYSTORE_PATH" ]]; then
        echo "  📦 No keystore found — generating one..."
        KEYSTORE_PATH="android/app/release-keystore.jks"
        mkdir -p "$(dirname "$KEYSTORE_PATH")"
        ALIAS="${REPO##*/}-upload"
        keytool -genkey -v \
            -keystore "$KEYSTORE_PATH" \
            -keyalg RSA -keysize 2048 \
            -validity 10000 \
            -alias "$ALIAS" \
            -storepass "${ANDROID_STOREPASS:-changeit}" \
            -keypass "${ANDROID_KEYPASS:-changeit}" \
            -dname "CN=${REPO##*/}, OU=Dev, O=${REPO##*/}, L=Unknown, ST=Unknown, C=US" 2>/dev/null
        echo "  📦 Generated: $KEYSTORE_PATH"
    fi
    
    KEYSTORE_B64=$(base64 < "$KEYSTORE_PATH")
    ALIAS="${REPO##*/}-upload"
    
    add_secret "ANDROID_KEYSTORE_BASE64" "$KEYSTORE_B64"
    add_secret "ANDROID_KEYSTORE_PASSWORD" "${ANDROID_STOREPASS:-changeit}"
    add_secret "ANDROID_KEY_PASSWORD" "${ANDROID_KEYPASS:-changeit}"
    add_secret "ANDROID_KEY_ALIAS" "$ALIAS"
fi

echo ""
echo "✅ Done! All secrets added to $REPO"
echo "   → Trigger: https://github.com/$REPO/actions"
