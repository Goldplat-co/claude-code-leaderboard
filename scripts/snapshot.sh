#!/bin/bash
set -euo pipefail

# ──────────────────────────────────────────────────────
# GoldPlat Claude Code 환경 스냅샷 수집기
# 사용자의 Claude Code 설정(CLAUDE.md, 스킬, 에이전트, 훅, MCP, 플러그인)을
# 수집하여 대시보드 API에 전송하는 스크립트
# ──────────────────────────────────────────────────────

CONFIG_DIR="$HOME/.goldplat"
CONFIG_FILE="$CONFIG_DIR/config.json"
CLAUDE_DIR="$HOME/.claude"
API_URL="${GOLDPLAT_SNAPSHOT_URL:-https://claude-code-leaderboard-blue.vercel.app/api/snapshot}"
API_KEY="${GOLDPLAT_SNAPSHOT_KEY:-goldplat-dashboard-2026}"
LOG_FILE="$CONFIG_DIR/snapshot.log"

# ── 닉네임 읽기 (collect.sh와 공유하는 config.json) ──
get_nickname() {
  if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "❌ 닉네임이 설정되지 않았습니다. 먼저 실행: scripts/collect.sh config --name \"닉네임\"" >&2
    exit 1
  fi
  python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['nickname'])"
}

# ── 환경 데이터 수집 (Python 임베딩) ──
collect_env() {
  CLAUDE_DIR_ARG="$CLAUDE_DIR" python3 << 'PYEOF'
import json, os, glob, re, sys

claude_dir = os.environ["CLAUDE_DIR_ARG"]
home = os.path.expanduser("~")

# ── 1. CLAUDE.md 내용 (최대 10KB) ──
claude_md = ""
claude_md_path = os.path.join(claude_dir, "CLAUDE.md")
try:
    with open(claude_md_path, encoding="utf-8") as f:
        claude_md = f.read()[:10000]
except (IOError, OSError):
    pass

# ── 2. 스킬 목록 (~/.claude/skills/*/SKILL.md) ──
skills = []
for skill_dir in sorted(glob.glob(os.path.join(claude_dir, "skills", "*"))):
    skill_file = os.path.join(skill_dir, "SKILL.md")
    if not os.path.isfile(skill_file):
        continue
    try:
        with open(skill_file, encoding="utf-8") as f:
            content = f.read(4000)
        # YAML frontmatter 파싱 (--- 사이의 내용)
        m = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
        name = os.path.basename(skill_dir)
        desc = ""
        if m:
            fm = m.group(1)
            nm = re.search(r"^name:\s*(.+)$", fm, re.MULTILINE)
            dm = re.search(r"^description:\s*(.+)$", fm, re.MULTILINE)
            if nm:
                name = nm.group(1).strip()
            if dm:
                desc = dm.group(1).strip()
        skills.append({"name": name, "description": desc})
    except (IOError, OSError):
        continue

# ── 3. 에이전트 목록 (~/.claude/agents/*.md) ──
agents = []
for agent_file in sorted(glob.glob(os.path.join(claude_dir, "agents", "*.md"))):
    try:
        with open(agent_file, encoding="utf-8") as f:
            content = f.read(4000)
        m = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
        name = os.path.splitext(os.path.basename(agent_file))[0]
        desc = ""
        model = ""
        if m:
            fm = m.group(1)
            nm = re.search(r"^name:\s*(.+)$", fm, re.MULTILINE)
            dm = re.search(r"^description:\s*(.+)$", fm, re.MULTILINE)
            mm = re.search(r"^model:\s*(.+)$", fm, re.MULTILINE)
            if nm:
                name = nm.group(1).strip()
            if dm:
                desc = dm.group(1).strip()
            if mm:
                model = mm.group(1).strip()
        agents.append({"name": name, "description": desc, "model": model})
    except (IOError, OSError):
        continue

# ── 4. 훅 목록 (~/.claude/settings.json → hooks) ──
hooks = []
settings_raw = {}
settings_path = os.path.join(claude_dir, "settings.json")
try:
    with open(settings_path, encoding="utf-8") as f:
        settings_raw = json.load(f)
    # hooks 구조: { "EventName": [ { hooks: [{type, command}], matcher? } ] }
    hooks_data = settings_raw.get("hooks", {})
    for event_name, entries in hooks_data.items():
        if not isinstance(entries, list):
            continue
        for entry in entries:
            matcher = entry.get("matcher", "")
            inner_hooks = entry.get("hooks", [])
            if not isinstance(inner_hooks, list):
                continue
            for h in inner_hooks:
                hook_type = h.get("type", "command")
                hooks.append({
                    "event": event_name,
                    "type": hook_type,
                    "matcher": matcher if matcher else None,
                })
except (IOError, OSError, json.JSONDecodeError):
    pass

# ── 5. MCP 커넥터 (~/.claude.json → projects.*.mcpServers) ──
mcp_connectors = []
claude_json_path = os.path.join(home, ".claude.json")
try:
    with open(claude_json_path, encoding="utf-8") as f:
        claude_json = json.load(f)
    # mcpServers는 최상위 또는 projects 하위에 존재할 수 있음
    seen = set()
    # 최상위 mcpServers
    for name, cfg in claude_json.get("mcpServers", {}).items():
        if name not in seen:
            mcp_type = cfg.get("type", cfg.get("transport", "unknown")) if isinstance(cfg, dict) else "unknown"
            mcp_connectors.append({"name": name, "type": str(mcp_type)})
            seen.add(name)
    # projects 하위 mcpServers
    for proj_key, proj_val in claude_json.get("projects", {}).items():
        if not isinstance(proj_val, dict):
            continue
        for name, cfg in proj_val.get("mcpServers", {}).items():
            if name not in seen:
                mcp_type = cfg.get("type", cfg.get("transport", "unknown")) if isinstance(cfg, dict) else "unknown"
                mcp_connectors.append({"name": name, "type": str(mcp_type)})
                seen.add(name)
except (IOError, OSError, json.JSONDecodeError):
    pass

# ── 6. 플러그인 목록 (~/.claude/plugins/installed_plugins.json) ──
plugins = []
plugins_path = os.path.join(claude_dir, "plugins", "installed_plugins.json")
try:
    with open(plugins_path, encoding="utf-8") as f:
        plugins_data = json.load(f)
    for plugin_id, entries in plugins_data.get("plugins", {}).items():
        if not isinstance(entries, list) or not entries:
            continue
        entry = entries[0]  # 첫 번째 설치 항목 사용
        name = plugin_id.split("@")[0] if "@" in plugin_id else plugin_id
        version = entry.get("version", "unknown")
        enabled = entry.get("scope", "") != ""  # scope 있으면 활성
        plugins.append({"name": name, "version": version, "enabled": enabled})
except (IOError, OSError, json.JSONDecodeError):
    pass

# ── 7. settings 전체 (permissions 등 포함) ──
settings_out = {}
try:
    settings_out = {
        "permissions": settings_raw.get("permissions", {}),
        "env": settings_raw.get("env", {}),
    }
except Exception:
    pass

# ── 결과 JSON 출력 ──
result = {
    "claude_md_content": claude_md,
    "skills": skills,
    "agents": agents,
    "hooks": hooks,
    "mcp_connectors": mcp_connectors,
    "plugins": plugins,
    "settings": settings_out,
}
print(json.dumps(result, ensure_ascii=False))
PYEOF
}

# ── send 서브커맨드: 데이터 수집 + API 전송 ──
cmd_send() {
  local nickname
  nickname=$(get_nickname)
  local target_date="${1:-$(date +%Y-%m-%d)}"

  echo "🔍 Claude Code 환경 스냅샷 수집 중..." | tee -a "$LOG_FILE"
  local env_data
  env_data=$(collect_env)

  local skill_count
  skill_count=$(echo "$env_data" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['skills']))")
  echo "  스킬: ${skill_count}개 | $(echo "$env_data" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'에이전트: {len(d[\"agents\"])}개 | 훅: {len(d[\"hooks\"])}개 | MCP: {len(d[\"mcp_connectors\"])}개 | 플러그인: {len(d[\"plugins\"])}개')")"

  echo "📤 전송 중... ($target_date)"
  local payload
  payload=$(echo "$env_data" | python3 -c "
import json, sys
d = json.load(sys.stdin)
d['nickname'] = '$nickname'
d['api_key'] = '$API_KEY'
d['date'] = '$target_date'
print(json.dumps(d, ensure_ascii=False))
")

  local response
  response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    --max-time 30)
  echo "✅ $response" | tee -a "$LOG_FILE"
}

# ── setup-cron 서브커맨드: macOS LaunchAgent 설정 ──
cmd_setup_cron() {
  local plist_path="$HOME/Library/LaunchAgents/co.goldplat.agent-snapshot.plist"
  local script_path="$CONFIG_DIR/snapshot.sh"

  mkdir -p "$CONFIG_DIR"
  cp "$0" "$script_path"
  chmod +x "$script_path"

  cat > "$plist_path" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>co.goldplat.agent-snapshot</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${script_path}</string>
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
  <string>${LOG_FILE}</string>
  <key>StandardErrorPath</key>
  <string>${CONFIG_DIR}/snapshot-error.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
    <key>GOLDPLAT_SNAPSHOT_URL</key>
    <string>${API_URL}</string>
    <key>GOLDPLAT_SNAPSHOT_KEY</key>
    <string>${API_KEY}</string>
  </dict>
</dict>
</plist>
PLIST

  launchctl unload "$plist_path" 2>/dev/null || true
  launchctl load "$plist_path"
  echo "✅ 자동 스냅샷이 설정되었습니다 (매일 09:05, collect.sh 5분 뒤)"
}

# ── status 서브커맨드: 설치 상태 확인 ──
cmd_status() {
  echo "=== GoldPlat 환경 스냅샷 상태 ==="
  # 닉네임
  if [[ -f "$CONFIG_FILE" ]]; then
    echo "닉네임: $(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['nickname'])")"
  else
    echo "닉네임: ❌ 미설정"
  fi
  # LaunchAgent
  local plist_path="$HOME/Library/LaunchAgents/co.goldplat.agent-snapshot.plist"
  if [[ -f "$plist_path" ]]; then
    echo "LaunchAgent: ✅ 설치됨"
  else
    echo "LaunchAgent: ❌ 미설치 (setup-cron 실행 필요)"
  fi
  # 최근 로그
  if [[ -f "$LOG_FILE" ]]; then
    echo "--- 최근 로그 (최대 5줄) ---"
    tail -5 "$LOG_FILE"
  else
    echo "로그: 아직 없음"
  fi
}

# ── 메인 분기 ──
case "${1:-help}" in
  send)       shift; cmd_send "${1:-}" ;;
  setup-cron) cmd_setup_cron ;;
  status)     cmd_status ;;
  *)
    echo "GoldPlat Claude Code 환경 스냅샷 수집기"
    echo ""
    echo "사용법:"
    echo "  $0 send [YYYY-MM-DD]   환경 데이터 수집 + API 전송 (기본: 오늘)"
    echo "  $0 setup-cron          macOS LaunchAgent 설정 (매일 09:05)"
    echo "  $0 status              설치 상태 + 최근 로그 확인"
    echo "  $0 help                이 도움말 표시"
    ;;
esac
