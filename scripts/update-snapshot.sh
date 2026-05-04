#!/bin/bash
# ──────────────────────────────────────────────────────
# GoldPlat Claude Code 리더보드 — 원클릭 셋업/패치
#
# 한 줄 설치:
#   curl -fsSL https://raw.githubusercontent.com/Goldplat-co/claude-code-leaderboard/main/scripts/update-snapshot.sh | bash
#
# 동작:
#   1) 닉네임 미설정 시 입력 받기
#   2) snapshot.sh / collect.sh 최신본 다운로드 (기존본 백업)
#   3) PROJECT_DIRS 자동 탐지 (CLAUDE.md 또는 .claude/ 가진 디렉터리)
#   4) LaunchAgent 설치 (매일 09:00 사용량 / 09:05 환경 스냅샷)
#   5) 즉시 1회 전송
#
# 환경변수 (선택):
#   PROJECT_DIRS  : 콜론 구분 프로젝트 루트. 미지정 시 자동 탐지
# ──────────────────────────────────────────────────────
set -euo pipefail

CONFIG_DIR="$HOME/.goldplat"
SNAPSHOT_TARGET="$CONFIG_DIR/snapshot.sh"
COLLECT_TARGET="$CONFIG_DIR/collect.sh"
RAW_BASE="https://raw.githubusercontent.com/Goldplat-co/claude-code-leaderboard/main/scripts"

mkdir -p "$CONFIG_DIR"

# curl | bash 환경에서도 read가 동작하도록 stdin을 tty로 전환
if [[ ! -t 0 ]] && [[ -r /dev/tty ]]; then
  exec < /dev/tty
fi

echo ""
echo "════════════════════════════════════════════════"
echo "  GoldPlat Claude Code 리더보드 셋업"
echo "════════════════════════════════════════════════"

# === 1. 닉네임 ===
if [[ ! -f "$CONFIG_DIR/config.json" ]]; then
  echo ""
  echo "👤 닉네임이 등록돼 있지 않습니다."
  read -r -p "   리더보드에 표시할 닉네임: " __nickname
  __nickname="${__nickname#"${__nickname%%[![:space:]]*}"}"  # trim leading
  __nickname="${__nickname%"${__nickname##*[![:space:]]}"}"  # trim trailing
  if [[ -z "$__nickname" ]]; then
    echo "❌ 닉네임이 비어있어 종료합니다."
    exit 1
  fi
  printf '{"nickname": "%s"}\n' "$__nickname" > "$CONFIG_DIR/config.json"
  echo "✅ 닉네임 등록: $__nickname"
else
  __existing=$(python3 -c "import json; print(json.load(open('$CONFIG_DIR/config.json')).get('nickname',''))" 2>/dev/null || echo "")
  echo ""
  echo "👤 기존 닉네임: ${__existing:-(읽기 실패)}"
fi

# === 2. 스크립트 다운로드 ===
download_script() {
  local target="$1" name="$2"
  if [[ -f "$target" ]]; then
    cp "$target" "$target.bak.$(date +%Y%m%d-%H%M%S)"
  fi
  echo "⬇️  $name 다운로드..."
  curl -fsSL "$RAW_BASE/$name" -o "$target"
  chmod +x "$target"
}
echo ""
download_script "$SNAPSHOT_TARGET" "snapshot.sh"
download_script "$COLLECT_TARGET" "collect.sh"

# === 3. PROJECT_DIRS 자동 탐지 ===
if [[ -z "${PROJECT_DIRS:-}" ]]; then
  echo ""
  echo "🔍 작업 프로젝트 탐지 중..."
  candidates=()
  shopt -s nullglob 2>/dev/null || true
  for parent in "$HOME" "$HOME/work" "$HOME/dev" "$HOME/code" "$HOME/Projects" "$HOME/projects" "$HOME/repos" "$HOME/src" "$HOME/Documents/code" "$HOME/Documents/dev"; do
    [[ -d "$parent" ]] || continue
    for d in "$parent"/*/; do
      [[ -d "$d" ]] || continue
      d="${d%/}"
      # CLAUDE.md가 비어있지 않거나 .claude/ 디렉터리가 있으면 후보
      if { [[ -f "$d/CLAUDE.md" ]] && [[ -s "$d/CLAUDE.md" ]]; } || [[ -d "$d/.claude" ]]; then
        candidates+=("$d")
      fi
    done
    if [[ "$parent" != "$HOME" ]] && [[ -f "$parent/CLAUDE.md" ]] && [[ -s "$parent/CLAUDE.md" ]]; then
      candidates+=("$parent")
    fi
  done
  if (( ${#candidates[@]} > 0 )); then
    PROJECT_DIRS=$(printf '%s\n' "${candidates[@]}" | awk '!seen[$0]++' | paste -sd: -)
    echo "   탐지된 프로젝트 (${#candidates[@]}개):"
    printf '%s\n' "${candidates[@]}" | awk '!seen[$0]++' | sed 's/^/     - /'
  else
    PROJECT_DIRS="$HOME"
    echo "   탐지된 프로젝트 없음. 기본값 사용: $HOME"
  fi
fi
export PROJECT_DIRS

# === 4. LaunchAgent 설치 (macOS) ===
install_launchagent() {
  local label="$1" script_path="$2" hour="$3" minute="$4" log_basename="$5"
  local plist="$HOME/Library/LaunchAgents/${label}.plist"
  mkdir -p "$HOME/Library/LaunchAgents"
  cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${script_path}</string>
    <string>send</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>${hour}</integer>
    <key>Minute</key><integer>${minute}</integer>
  </dict>
  <key>StandardOutPath</key><string>${CONFIG_DIR}/${log_basename}.log</string>
  <key>StandardErrorPath</key><string>${CONFIG_DIR}/${log_basename}-error.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
    <key>PROJECT_DIRS</key><string>${PROJECT_DIRS}</string>
  </dict>
</dict>
</plist>
PLIST
  launchctl unload "$plist" 2>/dev/null || true
  launchctl load "$plist"
}

echo ""
if command -v launchctl >/dev/null 2>&1 && [[ "$(uname)" == "Darwin" ]]; then
  echo "📅 자동 전송 등록 (LaunchAgent)..."
  install_launchagent "co.goldplat.agent-collect"  "$COLLECT_TARGET"  9 0 "collect"
  install_launchagent "co.goldplat.agent-snapshot" "$SNAPSHOT_TARGET" 9 5 "snapshot"
  echo "   매일 09:00 사용량 / 09:05 환경 스냅샷 자동 전송"
else
  echo "ℹ️  macOS가 아니라 자동 전송(cron)은 건너뜁니다."
fi

# === 5. 즉시 1회 전송 ===
echo ""
echo "🚀 즉시 1회 전송..."
if bash "$SNAPSHOT_TARGET" send; then
  :
else
  echo "⚠️  스냅샷 전송 실패 (네트워크?). 내일 09:05 자동 재시도됩니다."
fi
# 어제자 사용량도 1회 시도 (실패해도 무시)
bash "$COLLECT_TARGET" send 2>/dev/null || true

echo ""
echo "════════════════════════════════════════════════"
echo "  ✅ 셋업 완료"
echo "════════════════════════════════════════════════"
echo "  설정 폴더 : $CONFIG_DIR"
echo "  스캔 대상 : $PROJECT_DIRS"
echo "  대시보드  : https://claude-code-leaderboard-blue.vercel.app"
echo "════════════════════════════════════════════════"
