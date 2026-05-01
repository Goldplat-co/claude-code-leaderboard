'use client';

import type { GitHubRepo, GitHubActivity } from '@/lib/types';
import RepoRow from '@/components/repo-row';

interface GitHubClientProps {
  repos: GitHubRepo[];
  activity: GitHubActivity[];
}

/**
 * 날짜 문자열을 "N분 전", "N시간 전", "어제", "N일 전" 형태로 변환
 */
function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '기록 없음';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '어제';
  return `${days}일 전`;
}

/**
 * 상태 정렬 우선순위 (활발 → 보통 → 비활성 → 아카이브)
 */
const statusOrder: Record<string, number> = {
  active: 0,
  moderate: 1,
  inactive: 2,
  archived: 3,
};

/**
 * GitHub Health Check 메인 클라이언트 컴포넌트
 *
 * 4가지 섹션:
 * 1. 상단 4개 통계 카드 (전체 레포, 열린 PR, 금주 커밋, 이슈)
 * 2. 레포별 활동 현황 (RepoRow 목록)
 * 3. 멤버별 커밋 (금주) — 가로 바 차트
 * 4. 주의 필요 — 비활성/이슈/정상 레포 표시
 */
export default function GitHubClient({ repos, activity }: GitHubClientProps) {
  // ── 통계 계산 ──────────────────────────

  // 활성/비활성 레포 수
  const activeCount = repos.filter((r) => r.status === 'active' || r.status === 'moderate').length;
  const inactiveCount = repos.filter((r) => r.status === 'inactive' || r.status === 'archived').length;

  // 열린 PR 합계
  const totalOpenPR = repos.reduce((sum, r) => sum + r.open_pr_count, 0);

  // 금주 커밋 합계 (activity 데이터 기준)
  const totalWeekCommits = activity.reduce((sum, a) => sum + a.commit_count, 0);

  // 이슈 합계
  const totalIssues = repos.reduce((sum, r) => sum + r.open_issue_count, 0);

  // ── 레포별 집계: 커밋 수, PR 수, 기여자 ──────────────────────────

  // 레포별 activity 데이터를 집계
  const repoStats = new Map<
    string,
    { commits: number; prs: number; contributors: Set<string> }
  >();

  for (const a of activity) {
    const existing = repoStats.get(a.repo_name) ?? {
      commits: 0,
      prs: 0,
      contributors: new Set<string>(),
    };
    existing.commits += a.commit_count;
    existing.prs += a.pr_count;
    if (a.member_nickname) existing.contributors.add(a.member_nickname);
    repoStats.set(a.repo_name, existing);
  }

  // 상태 우선순위로 정렬된 레포 목록
  const sortedRepos = [...repos].sort(
    (a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
  );

  // ── 멤버별 커밋 집계 ──────────────────────────

  const memberCommits = new Map<string, number>();
  for (const a of activity) {
    if (a.member_nickname) {
      memberCommits.set(
        a.member_nickname,
        (memberCommits.get(a.member_nickname) ?? 0) + a.commit_count
      );
    }
  }

  // 커밋 수 내림차순 정렬
  const sortedMembers = [...memberCommits.entries()].sort((a, b) => b[1] - a[1]);
  const maxCommits = sortedMembers.length > 0 ? sortedMembers[0][1] : 1;

  // ── 주의 필요 목록 ──────────────────────────

  interface AlertItem {
    icon: string;
    name: string;
    message: string;
  }

  const alerts: AlertItem[] = [];

  for (const repo of repos) {
    if (repo.status === 'inactive') {
      // 마지막 커밋으로부터 며칠이 지났는지 계산
      const daysSince = repo.last_commit_at
        ? Math.floor(
            (Date.now() - new Date(repo.last_commit_at).getTime()) / 86400000
          )
        : null;
      alerts.push({
        icon: '\u{1F534}',
        name: repo.repo_name,
        message: daysSince !== null ? `${daysSince}일간 커밋 없음` : '커밋 기록 없음',
      });
    }

    if (repo.open_issue_count > 0) {
      alerts.push({
        icon: '\u{1F7E1}',
        name: repo.repo_name,
        message: `이슈 ${repo.open_issue_count}건 미해결`,
      });
    }
  }

  // 정상 레포 (active 상태 + 최근 커밋 있음)
  for (const repo of repos) {
    if (repo.status === 'active' && repo.last_commit_at) {
      alerts.push({
        icon: '\u{1F7E2}',
        name: repo.repo_name,
        message: '정상',
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 1. 상단 4개 통계 카드 ────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 전체 레포 */}
        <StatCard
          emoji="&#x1F4C1;"
          label="전체 레포"
          value={repos.length}
          sub={`활성 ${activeCount} · 비활성 ${inactiveCount}`}
        />

        {/* 열린 PR */}
        <StatCard
          emoji="&#x1F500;"
          label="열린 PR"
          value={totalOpenPR}
          valueColor="text-green-600"
        />

        {/* 금주 커밋 */}
        <StatCard
          emoji="&#x1F4DD;"
          label="금주 커밋"
          value={totalWeekCommits}
        />

        {/* 이슈 */}
        <StatCard
          emoji="&#x26A0;&#xFE0F;"
          label="이슈"
          value={totalIssues}
          valueColor={totalIssues > 0 ? 'text-amber-600' : undefined}
        />
      </div>

      {/* ── 2. 레포별 활동 현황 ────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            레포별 활동 현황
          </h2>
        </div>

        {sortedRepos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            등록된 레포가 없습니다.
          </div>
        ) : (
          sortedRepos.map((repo) => {
            const stats = repoStats.get(repo.repo_name);
            return (
              <RepoRow
                key={repo.id}
                repoName={repo.repo_name}
                visibility={repo.visibility}
                description={repo.description}
                lastCommitAt={repo.last_commit_at}
                status={repo.status}
                commitCount={stats?.commits ?? 0}
                prCount={stats?.prs ?? 0}
                contributors={stats ? [...stats.contributors] : []}
              />
            );
          })
        )}
      </div>

      {/* ── 3. 2-column: 멤버별 커밋 + 주의 필요 ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 멤버별 커밋 (금주) */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">
              &#x1F464; 멤버별 커밋 (금주)
            </h2>
          </div>

          <div className="p-4 space-y-3">
            {sortedMembers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                이번 주 커밋 데이터가 없습니다.
              </p>
            ) : (
              sortedMembers.map(([nickname, count]) => (
                <div key={nickname} className="flex items-center gap-3">
                  {/* 닉네임 */}
                  <span className="text-sm text-gray-700 w-20 truncate shrink-0">
                    {nickname}
                  </span>

                  {/* 가로 바 (골드 색상) */}
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all"
                      style={{
                        width: `${(count / maxCommits) * 100}%`,
                        backgroundColor: '#D4A020',
                      }}
                    />
                  </div>

                  {/* 커밋 수 */}
                  <span className="text-sm font-semibold tabular-nums text-gray-800 w-8 text-right">
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 주의 필요 */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">
              &#x26A0;&#xFE0F; 주의 필요
            </h2>
          </div>

          <div className="p-4 space-y-2">
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                특이사항 없음
              </p>
            ) : (
              alerts.map((alert, idx) => (
                <div
                  key={`${alert.name}-${idx}`}
                  className="flex items-center gap-2 text-sm py-1"
                >
                  <span>{alert.icon}</span>
                  <span className="font-medium text-gray-800">{alert.name}</span>
                  <span className="text-gray-400">--</span>
                  <span className="text-gray-600">{alert.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 통계 카드 서브 컴포넌트 ──────────────────────────

interface StatCardProps {
  emoji: string;
  label: string;
  value: number;
  sub?: string;
  valueColor?: string;
}

/**
 * 상단 통계 카드
 * 이모지 + 라벨, 큰 숫자, 선택적 서브텍스트
 */
function StatCard({ emoji, label, value, sub, valueColor }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
      <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
        <span dangerouslySetInnerHTML={{ __html: emoji }} />
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-bold tabular-nums ${valueColor ?? 'text-gray-900'}`}>
        {value}
      </div>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
