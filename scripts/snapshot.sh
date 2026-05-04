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
  CLAUDE_DIR_ARG="$CLAUDE_DIR" PROJECT_DIRS_ARG="${PROJECT_DIRS:-$HOME/juha_claude}" python3 << 'PYEOF'
import json, os, glob, re, sys

claude_dir = os.environ["CLAUDE_DIR_ARG"]
home = os.path.expanduser("~")
project_dirs = [p for p in os.environ.get("PROJECT_DIRS_ARG", "").split(":") if p and os.path.isdir(p)]

# ── 1. CLAUDE.md 내용 (최대 10KB, 사용자 + 프로젝트 머지) ──
claude_md_parts = []
for label, path in [("~/.claude/CLAUDE.md", os.path.join(claude_dir, "CLAUDE.md"))] + \
                   [(os.path.join(p, "CLAUDE.md"), os.path.join(p, "CLAUDE.md")) for p in project_dirs]:
    try:
        with open(path, encoding="utf-8") as f:
            content = f.read()
        if content.strip():
            claude_md_parts.append(f"# === {label} ===\n{content}")
    except (IOError, OSError):
        continue
claude_md = "\n\n".join(claude_md_parts)[:10000]

# ── 2. 스킬 목록 (사용자 + 플러그인 + 프로젝트) ──
def parse_md_frontmatter(filepath, fallback_name):
    try:
        with open(filepath, encoding="utf-8") as f:
            content = f.read(4000)
    except (IOError, OSError):
        return None
    m = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    name = fallback_name
    desc = ""
    model = ""
    if m:
        fm = m.group(1)
        nm = re.search(r"^name:\s*(.+)$", fm, re.MULTILINE)
        dm = re.search(r"^description:\s*(.+)$", fm, re.MULTILINE)
        mm = re.search(r"^model:\s*(.+)$", fm, re.MULTILINE)
        if nm: name = nm.group(1).strip()
        if dm: desc = dm.group(1).strip()
        if mm: model = mm.group(1).strip()
    return {"name": name, "description": desc, "model": model}

skill_globs = [
    os.path.join(claude_dir, "skills", "*", "SKILL.md"),
    os.path.join(claude_dir, "plugins", "marketplaces", "*", "plugins", "*", "skills", "*", "SKILL.md"),
    os.path.join(claude_dir, "plugins", "marketplaces", "*", "external_plugins", "*", "skills", "*", "SKILL.md"),
    os.path.join(claude_dir, "plugins", "cache", "*", "*", "*", "skills", "*", "SKILL.md"),
]
for p in project_dirs:
    skill_globs.append(os.path.join(p, ".claude", "skills", "*", "SKILL.md"))

skills = []
seen_skills = set()
for pattern in skill_globs:
    for skill_file in sorted(glob.glob(pattern)):
        fallback = os.path.basename(os.path.dirname(skill_file))
        info = parse_md_frontmatter(skill_file, fallback)
        if not info: continue
        key = info["name"]
        if key in seen_skills: continue
        seen_skills.add(key)
        skills.append({"name": info["name"], "description": info["description"]})

# ── 3. 에이전트 목록 (사용자 + 플러그인 + 프로젝트) ──
agent_globs = [
    os.path.join(claude_dir, "agents", "*.md"),
    os.path.join(claude_dir, "plugins", "marketplaces", "*", "plugins", "*", "agents", "*.md"),
    os.path.join(claude_dir, "plugins", "marketplaces", "*", "external_plugins", "*", "agents", "*.md"),
    os.path.join(claude_dir, "plugins", "cache", "*", "*", "*", "agents", "*.md"),
]
for p in project_dirs:
    agent_globs.append(os.path.join(p, ".claude", "agents", "*.md"))

agents = []
seen_agents = set()
for pattern in agent_globs:
    for agent_file in sorted(glob.glob(pattern)):
        fallback = os.path.splitext(os.path.basename(agent_file))[0]
        info = parse_md_frontmatter(agent_file, fallback)
        if not info: continue
        key = info["name"]
        if key in seen_agents: continue
        seen_agents.add(key)
        agents.append(info)

# ── 4. 훅 목록 (사용자 + 프로젝트 settings.json 머지) ──
def extract_hooks(settings_dict):
    out = []
    hooks_data = settings_dict.get("hooks", {})
    for event_name, entries in hooks_data.items():
        if not isinstance(entries, list): continue
        for entry in entries:
            matcher = entry.get("matcher", "")
            for h in entry.get("hooks", []):
                out.append({
                    "event": event_name,
                    "type": h.get("type", "command"),
                    "matcher": matcher if matcher else None,
                })
    return out

settings_paths = [os.path.join(claude_dir, "settings.json")]
for p in project_dirs:
    settings_paths.append(os.path.join(p, ".claude", "settings.json"))
    settings_paths.append(os.path.join(p, ".claude", "settings.local.json"))

hooks = []
settings_raw = {}
merged_permissions = {}
merged_env = {}
for sp in settings_paths:
    try:
        with open(sp, encoding="utf-8") as f:
            sdata = json.load(f)
    except (IOError, OSError, json.JSONDecodeError):
        continue
    if sp == settings_paths[0]:
        settings_raw = sdata
    hooks.extend(extract_hooks(sdata))
    if isinstance(sdata.get("permissions"), dict):
        merged_permissions.update(sdata["permissions"])
    if isinstance(sdata.get("env"), dict):
        merged_env.update(sdata["env"])

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

# ── 7. settings 전체 (permissions 등 포함, 사용자+프로젝트 머지) ──
settings_out = {
    "permissions": merged_permissions,
    "env": merged_env,
}

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
    <key>PROJECT_DIRS</key>
    <string>${PROJECT_DIRS:-$HOME/juha_claude}</string>
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
