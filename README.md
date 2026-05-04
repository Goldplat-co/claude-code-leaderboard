# Claude Code Leaderboard (GoldPlat)

GoldPlat 팀의 Claude Code 사용량·환경 셋업 리더보드.

대시보드: https://claude-code-leaderboard-blue.vercel.app

---

## 한 줄 설치 (신규 + 기존 모두)

터미널에 그대로 붙여넣고 엔터:

```bash
curl -fsSL https://raw.githubusercontent.com/Goldplat-co/claude-code-leaderboard/main/scripts/update-snapshot.sh | bash
```

자동으로:
1. 닉네임 미등록 시 입력 받기
2. `snapshot.sh` / `collect.sh` 최신본 다운로드 (기존본 백업)
3. **`PROJECT_DIRS` 자동 탐지** — `~/`, `~/work`, `~/dev`, `~/code`, `~/Projects`, `~/repos` 등에서 `CLAUDE.md` 또는 `.claude/` 가진 폴더를 찾아냄
4. LaunchAgent 등록 (매일 09:00 사용량 / 09:05 환경 스냅샷)
5. 즉시 1회 전송 → 점수 즉시 반영

### 자동 탐지가 못 잡는 위치라면 (선택)

```bash
PROJECT_DIRS="$HOME/elsewhere/foo:$HOME/elsewhere/bar" \
  curl -fsSL https://raw.githubusercontent.com/Goldplat-co/claude-code-leaderboard/main/scripts/update-snapshot.sh | bash
```

---

## 하네스 점수가 낮게 나오는 이유 (배경)

기존 `snapshot.sh`는 사용자 디렉터리(`~/.claude/`) 직속만 스캔해 다음을 누락:

| 항목 | Before | After |
|---|---|---|
| `CLAUDE.md` | `~/.claude/CLAUDE.md` 만 | `~/.claude/CLAUDE.md` + `$PROJECT_DIRS/CLAUDE.md` 머지 |
| 스킬 | `~/.claude/skills/*/SKILL.md` | + 플러그인 스킬(`marketplaces`, `cache`, `external_plugins`) + 프로젝트 스킬 |
| 에이전트 | `~/.claude/agents/*.md` | + 플러그인 에이전트 + 프로젝트 에이전트 |
| 훅 | `~/.claude/settings.json` | + `$PROJECT_DIRS/.claude/settings.json` + `settings.local.json` |
| 중복 | — | 이름 기준 dedupe |

---

## 개발 (대시보드 자체)

Next.js 프로젝트. 로컬 개발:

```bash
npm install
npm run dev    # http://localhost:3000
```

배포: Vercel.
