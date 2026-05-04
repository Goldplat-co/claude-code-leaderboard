#!/bin/bash
# ──────────────────────────────────────────────────────
# GoldPlat Claude Code 환경 스냅샷 업데이터
#
# 기존 snapshot.sh가 ~/.claude/CLAUDE.md, ~/.claude/skills/만 보고 있어
# 플러그인 스킬 / 프로젝트 CLAUDE.md / 프로젝트 hooks를 누락 → 하네스 점수 저평가.
# 이 스크립트는 GitHub raw에서 패치된 snapshot.sh를 받아
# ~/.goldplat/snapshot.sh를 덮어쓰고 곧바로 1회 재전송한다.
#
# 사용법 (팀원에게 공유):
#   curl -fsSL https://raw.githubusercontent.com/Goldplat-co/claude-code-leaderboard/main/scripts/update-snapshot.sh | bash
#
# 환경변수:
#   PROJECT_DIRS  : 추가로 스캔할 프로젝트 루트(콜론 구분, 기본 $HOME/juha_claude)
#                   예) PROJECT_DIRS="$HOME/work/foo:$HOME/work/bar" curl ... | bash
# ──────────────────────────────────────────────────────
set -euo pipefail

CONFIG_DIR="$HOME/.goldplat"
TARGET="$CONFIG_DIR/snapshot.sh"
RAW_URL="https://raw.githubusercontent.com/Goldplat-co/claude-code-leaderboard/main/scripts/snapshot.sh"

if [[ ! -f "$CONFIG_DIR/config.json" ]]; then
  echo "❌ ~/.goldplat/config.json 이 없습니다."
  echo "   먼저 닉네임을 등록하세요:  ./scripts/collect.sh config --name \"닉네임\""
  exit 1
fi

mkdir -p "$CONFIG_DIR"

if [[ -f "$TARGET" ]]; then
  cp "$TARGET" "$TARGET.bak.$(date +%Y%m%d-%H%M%S)"
  echo "📦 기존 스크립트 백업 완료"
fi

echo "⬇️  최신 snapshot.sh 다운로드 중..."
curl -fsSL "$RAW_URL" -o "$TARGET"
chmod +x "$TARGET"
echo "✅ ~/.goldplat/snapshot.sh 갱신 완료"

# LaunchAgent가 이미 설치돼 있다면 그대로 재사용 (스크립트 경로 동일)
echo "🚀 즉시 1회 재전송"
PROJECT_DIRS="${PROJECT_DIRS:-$HOME/juha_claude}" bash "$TARGET" send

echo ""
echo "💡 매일 09:05 자동 전송도 동일 스크립트를 호출하므로 추가 작업 불필요."
echo "   다른 프로젝트 루트도 포함하려면 LaunchAgent의 EnvironmentVariables에"
echo "   PROJECT_DIRS=/path/a:/path/b 를 추가하세요."
