#!/bin/bash
set -euo pipefail

CONFIG_DIR="$HOME/.goldplat"
CONFIG_FILE="$CONFIG_DIR/config.json"
CLAUDE_DIR="$HOME/.claude"
API_URL="${GOLDPLAT_API_URL:-https://claude-code-leaderboard-blue.vercel.app/api/submit}"
API_KEY="${GOLDPLAT_API_KEY:-goldplat-leaderboard-2026}"

cmd_config() {
  mkdir -p "$CONFIG_DIR"
  if [[ "${1:-}" == "--name" && -n "${2:-}" ]]; then
    echo "{\"nickname\": \"$2\"}" > "$CONFIG_FILE"
    echo "✅ 닉네임이 '$2'(으)로 설정되었습니다."
  else
    echo "사용법: $0 config --name \"닉네임\""
    exit 1
  fi
}

get_nickname() {
  if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "❌ 닉네임이 설정되지 않았습니다. 먼저 실행: $0 config --name \"닉네임\"" >&2
    exit 1
  fi
  python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['nickname'])"
}

parse_usage() {
  local target_date="${1:-$(date -v-1d +%Y-%m-%d)}"
  CLAUDE_DIR_ARG="$CLAUDE_DIR" TARGET_DATE_ARG="$target_date" python3 << 'PYEOF'
import json, os, glob

claude_dir = os.environ["CLAUDE_DIR_ARG"]
target_date = os.environ["TARGET_DATE_ARG"]

PRICING = {
    "claude-opus-4-6": {"input": 15.0, "output": 75.0},
    "claude-sonnet-4-6": {"input": 3.0, "output": 15.0},
    "claude-haiku-4-5": {"input": 1.0, "output": 5.0},
}
DEFAULT_PRICING = {"input": 3.0, "output": 15.0}

total_input = 0
total_output = 0
total_cost = 0.0
session_ids = set()

for filepath in glob.glob(os.path.join(claude_dir, "projects", "**", "*.jsonl"), recursive=True):
    try:
        with open(filepath) as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                except json.JSONDecodeError:
                    continue
                ts = entry.get("timestamp", "")
                if not ts.startswith(target_date):
                    continue
                if entry.get("type") == "assistant":
                    msg = entry.get("message", {})
                    usage = msg.get("usage", {})
                    model = msg.get("model", "")
                    inp = usage.get("input_tokens", 0)
                    cache_create = usage.get("cache_creation_input_tokens", 0)
                    cache_read = usage.get("cache_read_input_tokens", 0)
                    out = usage.get("output_tokens", 0)
                    total_input += inp + cache_create + cache_read
                    total_output += out
                    pricing = DEFAULT_PRICING
                    for model_key, p in PRICING.items():
                        if model_key in model:
                            pricing = p
                            break
                    cost = (inp + cache_create + cache_read) / 1_000_000 * pricing["input"]
                    cost += out / 1_000_000 * pricing["output"]
                    total_cost += cost
                    sid = entry.get("sessionId", "")
                    if sid:
                        session_ids.add(sid)
    except (IOError, PermissionError):
        continue

print(json.dumps({
    "input_tokens": total_input,
    "output_tokens": total_output,
    "total_tokens": total_input + total_output,
    "cost_usd": round(total_cost, 4),
    "session_count": len(session_ids),
}))
PYEOF
}

cmd_send() {
  local nickname
  nickname=$(get_nickname)
  local target_date="${1:-$(date -v-1d +%Y-%m-%d)}"
  echo "📊 $target_date 사용량 집계 중..."
  local usage
  usage=$(parse_usage "$target_date")
  local total_tokens
  total_tokens=$(echo "$usage" | python3 -c "import json,sys; print(json.load(sys.stdin)['total_tokens'])")
  echo "  집계 결과: $usage"
  if [[ "$total_tokens" == "0" ]]; then
    echo "⚠️  $target_date에 사용 데이터가 없습니다."
    return 0
  fi
  echo "📤 전송 중..."
  local payload
  payload=$(echo "$usage" | python3 -c "
import json, sys
d = json.load(sys.stdin)
d['nickname'] = '$nickname'
d['api_key'] = '$API_KEY'
d['date'] = '$target_date'
print(json.dumps(d))
")
  local response
  response=$(curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d "$payload")
  echo "✅ $response"
}

cmd_setup_cron() {
  local plist_path="$HOME/Library/LaunchAgents/co.goldplat.agent-collect.plist"
  local script_path="$CONFIG_DIR/collect.sh"
  cp "$0" "$script_path"
  chmod +x "$script_path"
  cat > "$plist_path" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>co.goldplat.agent-collect</string>
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
    <key>GOLDPLAT_API_URL</key>
    <string>${API_URL}</string>
    <key>GOLDPLAT_API_KEY</key>
    <string>${API_KEY}</string>
  </dict>
</dict>
</plist>
PLIST
  launchctl unload "$plist_path" 2>/dev/null || true
  launchctl load "$plist_path"
  echo "✅ 자동 전송이 설정되었습니다 (매일 09:00)"
}

case "${1:-help}" in
  config)   shift; cmd_config "$@" ;;
  send)     shift; cmd_send "${@:-}" ;;
  setup-cron) cmd_setup_cron ;;
  *)
    echo "GoldPlat AI 리더보드 — 사용량 수집"
    echo "  $0 config --name \"닉네임\""
    echo "  $0 send [YYYY-MM-DD]"
    echo "  $0 setup-cron"
    ;;
esac
