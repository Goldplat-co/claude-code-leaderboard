#!/bin/bash
set -euo pipefail

# ──────────────────────────────────────────────────────
# GoldPlat 통합 설치 스크립트
# 리더보드 수집기 + 대시보드 수집기를 한 번에 설치
#
# 사용법:
#   curl -sL https://claude-code-leaderboard-blue.vercel.app/install.sh | bash -s "닉네임"
# ──────────────────────────────────────────────────────

NICKNAME="${1:-}"
CONFIG_DIR="$HOME/.goldplat"
CONFIG_FILE="$CONFIG_DIR/config.json"
GITHUB_BASE="https://raw.githubusercontent.com/Goldplat-co/claude-code-leaderboard/main/scripts"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GoldPlat Claude Code 수집기 통합 설치"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. 닉네임 확인 ──
if [[ -z "$NICKNAME" ]]; then
  echo "❌ 닉네임을 입력해주세요."
  echo ""
  echo "사용법:"
  echo "  curl -sL https://claude-code-leaderboard-blue.vercel.app/install.sh | bash -s \"닉네임\""
  echo ""
  echo "예시:"
  echo "  curl -sL https://claude-code-leaderboard-blue.vercel.app/install.sh | bash -s \"진영\""
  exit 1
fi

# ── 2. python3 확인 ──
if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ python3이 설치되어 있지 않습니다."
  echo "   macOS: xcode-select --install 실행 후 다시 시도해주세요."
  exit 1
fi

# ── 3. 디렉토리 생성 ──
echo "📁 디렉토리 생성..."
mkdir -p "$CONFIG_DIR"

# ── 4. 스크립트 다운로드 ──
echo "📥 리더보드 수집기 다운로드..."
if curl -sL "$GITHUB_BASE/collect.sh" -o "$CONFIG_DIR/collect.sh"; then
  chmod +x "$CONFIG_DIR/collect.sh"
  echo "   ✅ collect.sh 설치 완료"
else
  echo "   ❌ collect.sh 다운로드 실패. 네트워크를 확인해주세요."
  exit 1
fi

echo "📥 대시보드 수집기 다운로드..."
if curl -sL "$GITHUB_BASE/snapshot.sh" -o "$CONFIG_DIR/snapshot.sh"; then
  chmod +x "$CONFIG_DIR/snapshot.sh"
  echo "   ✅ snapshot.sh 설치 완료"
else
  echo "   ❌ snapshot.sh 다운로드 실패. 네트워크를 확인해주세요."
  exit 1
fi

# ── 5. 닉네임 설정 ──
echo "👤 닉네임 설정: $NICKNAME"
if [[ -f "$CONFIG_FILE" ]]; then
  cp "$CONFIG_FILE" "$CONFIG_FILE.bak"
fi
echo "{\"nickname\": \"$NICKNAME\"}" > "$CONFIG_FILE"
echo "   ✅ 닉네임 저장 완료"

# ── 6. 자동 전송 설정 (LaunchAgent) ──
echo "⏰ 자동 전송 설정..."

# 리더보드 cron (매일 09:00)
COLLECT_PLIST="$HOME/Library/LaunchAgents/co.goldplat.agent-collect.plist"
cat > "$COLLECT_PLIST" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>co.goldplat.agent-collect</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${CONFIG_DIR}/collect.sh</string>
    <string>send</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>9</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${CONFIG_DIR}/collect.log</string>
  <key>StandardErrorPath</key>
  <string>${CONFIG_DIR}/collect-error.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
  </dict>
</dict>
</plist>
PLIST
launchctl unload "$COLLECT_PLIST" 2>/dev/null || true
launchctl load "$COLLECT_PLIST"
echo "   ✅ 리더보드 자동 전송 (매일 09:00)"

# 대시보드 cron (매일 09:05)
SNAPSHOT_PLIST="$HOME/Library/LaunchAgents/co.goldplat.agent-snapshot.plist"
cat > "$SNAPSHOT_PLIST" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>co.goldplat.agent-snapshot</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${CONFIG_DIR}/snapshot.sh</string>
    <string>send</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>9</integer>
    <key>Minute</key>
    <integer>5</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${CONFIG_DIR}/snapshot.log</string>
  <key>StandardErrorPath</key>
  <string>${CONFIG_DIR}/snapshot-error.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
  </dict>
</dict>
</plist>
PLIST
launchctl unload "$SNAPSHOT_PLIST" 2>/dev/null || true
launchctl load "$SNAPSHOT_PLIST"
echo "   ✅ 대시보드 자동 전송 (매일 09:05)"

# ── 7. 테스트 전송 ──
echo ""
echo "🧪 테스트 전송 중..."
echo ""

echo "--- 리더보드 (토큰 사용량) ---"
"$CONFIG_DIR/collect.sh" send "$(date +%Y-%m-%d)" 2>&1 || echo "   ⚠️  리더보드 전송 실패 (Claude Code 사용 이력이 없으면 정상)"

echo ""
echo "--- 대시보드 (환경 스냅샷) ---"
"$CONFIG_DIR/snapshot.sh" send 2>&1 || echo "   ⚠️  대시보드 전송 실패"

# ── 8. 최종 결과 ──
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ 설치 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  닉네임:     $NICKNAME"
echo "  설치 위치:  $CONFIG_DIR/"
echo "  자동 전송:  매일 09:00 (리더보드) + 09:05 (대시보드)"
echo ""
echo "  📊 리더보드: https://claude-code-leaderboard-blue.vercel.app"
echo ""
echo "  수동 전송:  ~/.goldplat/collect.sh send"
echo "              ~/.goldplat/snapshot.sh send"
echo "  상태 확인:  ~/.goldplat/snapshot.sh status"
echo ""
