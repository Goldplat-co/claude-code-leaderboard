import { Octokit } from '@octokit/rest';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * GitHub 조직의 레포/커밋 데이터를 Supabase에 동기화하는 함수
 * - 조직의 전체 레포 목록 조회
 * - 레포별 상태(active/moderate/inactive/archived) 판정
 * - 최근 7일 커밋을 작성자+날짜별로 집계
 * - GITHUB_USER_MAP 환경변수로 GitHub 유저명 → 닉네임 매핑
 */
export async function syncGitHubData(supabase: SupabaseClient) {
  const pat = process.env.GITHUB_PAT;
  if (!pat) throw new Error('GITHUB_PAT not configured');

  const octokit = new Octokit({ auth: pat });
  const org = process.env.GITHUB_ORG || 'goldplat-co';
  const userMap = parseUserMap();
  const today = new Date().toISOString().slice(0, 10);

  // 조직의 전체 레포 목록 조회
  const { data: repos } = await octokit.repos.listForOrg({
    org, type: 'all', per_page: 100,
  });

  for (const repo of repos) {
    // 마지막 push 이후 경과일로 상태 판정
    const daysSincePush = repo.pushed_at
      ? Math.floor((Date.now() - new Date(repo.pushed_at).getTime()) / 86400000)
      : 999;
    let status = 'active';
    if (repo.archived) status = 'archived';
    else if (daysSincePush > 28) status = 'inactive';
    else if (daysSincePush > 7) status = 'moderate';

    // 오픈 PR 수 조회 (이슈 수에서 PR을 빼야 순수 이슈 수)
    let openPRs = 0;
    let openIssues = 0;
    try {
      const { data: prs } = await octokit.pulls.list({
        owner: org, repo: repo.name, state: 'open', per_page: 100,
      });
      openPRs = prs.length;
      openIssues = Math.max(0, (repo.open_issues_count || 0) - openPRs);
    } catch { /* 접근 권한 없는 레포 건너뛰기 */ }

    // 레포 상태 upsert
    await supabase.from('github_repos').upsert({
      repo_name: repo.name,
      visibility: repo.private ? 'private' : 'public',
      description: repo.description || '',
      last_commit_at: repo.pushed_at,
      open_pr_count: openPRs,
      open_issue_count: openIssues,
      status,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'repo_name' });

    // 최근 7일 커밋 조회 → 작성자+날짜별 집계
    try {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: commits } = await octokit.repos.listCommits({
        owner: org, repo: repo.name, since, per_page: 100,
      });

      // 커밋을 (날짜|닉네임) 키로 그룹핑
      const byKey: Record<string, number> = {};
      for (const c of commits) {
        const login = c.author?.login || c.commit?.author?.name || 'unknown';
        const nickname = userMap[login] || login;
        const commitDate = (c.commit?.author?.date || today).slice(0, 10);
        const key = `${commitDate}|${nickname}`;
        byKey[key] = (byKey[key] || 0) + 1;
      }

      // 집계된 커밋 데이터 upsert
      for (const [key, count] of Object.entries(byKey)) {
        const [date, nickname] = key.split('|');
        await supabase.from('github_activity').upsert({
          date, repo_name: repo.name, member_nickname: nickname,
          commit_count: count, pr_count: 0, review_count: 0,
        }, { onConflict: 'date,repo_name,member_nickname' });
      }
    } catch { /* 커밋 접근 권한 없는 레포 건너뛰기 */ }
  }

  return { synced: repos.length, date: today };
}

/**
 * GITHUB_USER_MAP 환경변수를 파싱하여 GitHub 유저명 → 닉네임 매핑 객체 반환
 * 형식: "githubUser1:닉네임1,githubUser2:닉네임2"
 */
function parseUserMap(): Record<string, string> {
  const raw = process.env.GITHUB_USER_MAP || '';
  const map: Record<string, string> = {};
  for (const pair of raw.split(',')) {
    const [gh, nick] = pair.split(':');
    if (gh?.trim() && nick?.trim()) map[gh.trim()] = nick.trim();
  }
  return map;
}
