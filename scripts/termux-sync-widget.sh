#!/data/data/com.termux/files/usr/bin/bash
# OpenClaw Auth Status Widget
# Checks Claude Code auth on the OpenClaw server and restarts the gateway
# when auth is healthy. Interactive re-auth is handled by mobile-reauth.sh.
# Place in ~/.shortcuts/ on phone for Termux:Widget

termux-toast "Checking OpenClaw auth..."

SERVER="${OPENCLAW_SERVER:-l36}"
RESULT=$(ssh "$SERVER" '$HOME/openclaw/scripts/claude-auth-status.sh simple' 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ] && [ "$RESULT" = "OK" ]; then
    DETAILS=$(ssh "$SERVER" '$HOME/openclaw/scripts/claude-auth-status.sh json' 2>&1)
    HOURS=$(echo "$DETAILS" | jq -r '.claude_code.status' | grep -oP '\d+(?=h)' || echo "?")
    ssh "$SERVER" 'openclaw gateway restart' >/dev/null 2>&1 || true
    termux-vibrate -d 100
    termux-toast "OpenClaw auth OK (${HOURS}h)"
else
    termux-vibrate -d 300
    termux-toast "Auth needs check: ${RESULT}"
    termux-notification -t "OpenClaw Re-Auth" -c "Run: ssh $SERVER '~/openclaw/scripts/mobile-reauth.sh'" --id openclaw-auth
fi
