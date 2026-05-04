# Claude Code Leaderboard (GoldPlat)

GoldPlat 팀의 Claude Code 사용량·환경 셋업 리더보드.

대시보드: https://claude-code-leaderboard-blue.vercel.app

---

## 🚨 하네스 점수가 낮게 나와요? (스냅샷 패치)

기존 `~/.goldplat/snapshot.sh`는 사용자 디렉터리(`~/.claude/`)만 스캔해서
**플러그인 스킬 / 프로젝트 `CLAUDE.md` / 프로젝트 `hooks`를 누락**합니다.
실제 셋업이 풍부한데도 점수가 30~40점에 머무는 원인입니다.

### 한 줄로 패치 + 재전송

```bash
curl -fsSL https://raw.githubusercontent.com/Goldplat-co/claude-code-leaderboard/main/scripts/update-snapshot.sh | bash
```

실행하면:
1. 기존 `~/.goldplat/snapshot.sh`를 백업
2. 패치된 `snapshot.sh`로 덮어쓰기
3. 즉시 1회 재전송 (점수 갱신)
4. 매일 09:05 LaunchAgent도 자동으로 패치 버전을 사용

### 스캔 대상 추가하고 싶다면 (선택)

추가 프로젝트 루트도 함께 스캔하려면:

```bash
PROJECT_DIRS="$HOME/work/foo:$HOME/work/bar" \
  curl -fsSL https://raw.githubusercontent.com/Goldplat-co/claude-code-leaderboard/main/scripts/update-snapshot.sh | bash
```

(기본값은 `$HOME/juha_claude`)

### 패치가 무엇을 고치나

| 항목 | Before | After |
|---|---|---|
| `CLAUDE.md` | `~/.claude/CLAUDE.md` 만 | `~/.claude/CLAUDE.md` + `$PROJECT_DIRS/CLAUDE.md` 머지 |
| 스킬 | `~/.claude/skills/*/SKILL.md` | + 플러그인 스킬(`marketplaces`, `cache`, `external_plugins`) + 프로젝트 스킬 |
| 에이전트 | `~/.claude/agents/*.md` | + 플러그인 에이전트 + 프로젝트 에이전트 |
| 훅 | `~/.claude/settings.json` | + `$PROJECT_DIRS/.claude/settings.json` + `settings.local.json` |
| 중복 | — | 이름 기준 dedupe |

---

## 최초 설치 (신규 팀원)

```bash
# 1) 닉네임 설정
./scripts/collect.sh config --name "홍길동"

# 2) 사용량 자동 전송 (매일 09:00)
./scripts/collect.sh setup-cron

# 3) 환경 스냅샷 자동 전송 (매일 09:05)
./scripts/snapshot.sh setup-cron
```

---

## 개발 (대시보드 자체)

Next.js 프로젝트. 로컬 개발:

```bash
npm install
npm run dev    # http://localhost:3000
```

배포: Vercel.
