'use client';

import type { Member, EnvSnapshot, DailyUsage } from '@/lib/types';
import TeamTable, { type TeamRow } from '@/components/team-table';

interface TeamClientProps {
  members: Member[];
  snapshots: EnvSnapshot[];
  dailyUsage: DailyUsage[];
}

/**
 * 팀 모니터링 페이지의 메인 클라이언트 컴포넌트
 *
 * 3개 섹션으로 구성:
 * 1. 상단 4개 통계 카드 (활성 멤버, 팀 평균 하네스, 팀 총 스킬, 오늘 세션)
 * 2. 팀 비교 테이블 (TeamTable 컴포넌트)
 * 3. 2컬럼 그리드 (이번 주 MVP + 팀 알림)
 */
export default function TeamClient({
  members,
  snapshots,
  dailyUsage,
}: TeamClientProps) {
  // ─── 데이터 가공 ────────────────────────────────

  // 각 멤버의 최신 스냅샷을 찾아서 Map으로 관리
  const latestSnapshotMap = new Map<string, EnvSnapshot>();
  for (const snap of snapshots) {
    if (!latestSnapshotMap.has(snap.member_id)) {
      // snapshots는 date desc로 정렬되어 있으므로 첫 번째가 최신
      latestSnapshotMap.set(snap.member_id, snap);
    }
  }

  // 7일 전 날짜 계산 (성장 비교 및 활동량 집계용)
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  // 각 멤버의 7일 전 스냅샷 찾기 (성장 판단용)
  const weekAgoSnapshotMap = new Map<string, EnvSnapshot>();
  for (const snap of snapshots) {
    if (snap.date <= sevenDaysAgoStr && !weekAgoSnapshotMap.has(snap.member_id)) {
      weekAgoSnapshotMap.set(snap.member_id, snap);
    }
  }

  // 오늘 날짜 (YYYY-MM-DD)
  const todayStr = now.toISOString().slice(0, 10);

  // 각 멤버의 최근 7일 세션 합산 (가장 활동적인 멤버 판정용)
  const weeklySessionMap = new Map<string, number>();
  for (const usage of dailyUsage) {
    if (usage.date >= sevenDaysAgoStr) {
      weeklySessionMap.set(
        usage.member_id,
        (weeklySessionMap.get(usage.member_id) ?? 0) + usage.session_count
      );
    }
  }

  // 오늘 전체 세션 수 합산
  const todaySessions = dailyUsage
    .filter((u) => u.date === todayStr)
    .reduce((sum, u) => sum + u.session_count, 0);

  // ─── 뱃지 판정 로직 ────────────────────────────

  // 하네스 최고점 멤버 ID (best-setup)
  let bestSetupId = '';
  let bestHarness = -1;
  for (const [memberId, snap] of latestSnapshotMap) {
    if (snap.harness_score > bestHarness) {
      bestHarness = snap.harness_score;
      bestSetupId = memberId;
    }
  }

  // 주간 세션 최다 멤버 ID (most-active)
  let mostActiveId = '';
  let mostSessions = -1;
  for (const [memberId, sessions] of weeklySessionMap) {
    if (sessions > mostSessions) {
      mostSessions = sessions;
      mostActiveId = memberId;
    }
  }

  // 성장 멤버 판정 (하네스 5점 이상 상승)
  const growingIds = new Set<string>();
  for (const [memberId, latest] of latestSnapshotMap) {
    const weekAgo = weekAgoSnapshotMap.get(memberId);
    if (weekAgo && latest.harness_score - weekAgo.harness_score >= 5) {
      growingIds.add(memberId);
    }
  }

  // 스냅샷이 있는(활성) 멤버 수
  const activeMembers = latestSnapshotMap.size;

  // 팀 평균 하네스 점수
  const avgHarness =
    activeMembers > 0
      ? Math.round(
          Array.from(latestSnapshotMap.values()).reduce(
            (sum, s) => sum + s.harness_score,
            0
          ) / activeMembers
        )
      : 0;

  // 팀 총 스킬 수
  const totalSkills = Array.from(latestSnapshotMap.values()).reduce(
    (sum, s) => sum + s.skill_count,
    0
  );

  // ─── TeamTable 행 데이터 구성 ────────────────────

  const rows: TeamRow[] = members.map((member) => {
    const snap = latestSnapshotMap.get(member.id);

    // 뱃지 판정: best-setup > most-active > growing > starter 우선순위
    let badge: TeamRow['badge'] = 'starter';
    if (member.id === bestSetupId) {
      badge = 'best-setup';
    } else if (member.id === mostActiveId) {
      badge = 'most-active';
    } else if (growingIds.has(member.id)) {
      badge = 'growing';
    } else if (snap && snap.harness_score >= 60) {
      // 60점 이상이면서 특별한 뱃지가 없으면 뱃지 없이 두되,
      // starter가 아닌 경우는 growing으로 표시 (기본)
      badge = 'growing';
    }

    return {
      nickname: member.nickname,
      avatar_color: member.avatar_color,
      harness_score: snap?.harness_score ?? 0,
      skill_count: snap?.skill_count ?? 0,
      agent_count: snap?.agent_count ?? 0,
      hook_count: snap?.hook_count ?? 0,
      mcp_count: snap?.mcp_count ?? 0,
      plugin_count: snap?.plugin_count ?? 0,
      last_snapshot_date: snap?.date ?? null,
      badge,
    };
  });

  // ─── MVP 선정 (하네스 최고) ────────────────────

  const mvpMember = bestSetupId
    ? members.find((m) => m.id === bestSetupId)
    : null;
  const mvpSnapshot = bestSetupId
    ? latestSnapshotMap.get(bestSetupId)
    : null;

  // ─── 팀 알림 자동 생성 ────────────────────

  const alerts: string[] = [];

  for (const member of members) {
    const snap = latestSnapshotMap.get(member.id);

    // 에이전트 미설정 경고
    if (snap && snap.agent_count === 0) {
      alerts.push(`${member.nickname} -- 에이전트 미설정`);
    }

    // 스냅샷 자체가 없으면 데이터 없음 경고
    if (!snap) {
      alerts.push(`${member.nickname} -- 환경 데이터 미수집`);
    }

    // 스킬 성장 확인 (이전 스냅샷 대비)
    const weekAgo = weekAgoSnapshotMap.get(member.id);
    if (snap && weekAgo && snap.skill_count > weekAgo.skill_count) {
      const diff = snap.skill_count - weekAgo.skill_count;
      alerts.push(`${member.nickname} -- 스킬 +${diff}개 성장`);
    }
  }

  // 주간 최다 활동 멤버 알림
  if (mostActiveId && mostSessions > 0) {
    const activeMember = members.find((m) => m.id === mostActiveId);
    if (activeMember) {
      alerts.push(
        `${activeMember.nickname} -- 금주 ${mostSessions}세션 최다 활동`
      );
    }
  }

  // 하네스 최고점 달성 알림
  if (mvpMember && mvpSnapshot) {
    alerts.push(
      `${mvpMember.nickname} -- 하네스 ${mvpSnapshot.harness_score}점 달성! 팀 최고`
    );
  }

  // ─── 렌더링 ────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── 1. 상단 4개 통계 카드 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 활성 멤버 */}
        <StatCard
          icon="👤"
          label="활성 멤버"
          value={`${activeMembers}`}
          sub={`/ ${members.length}`}
        />
        {/* 팀 평균 하네스 */}
        <StatCard
          icon="🎯"
          label="팀 평균 하네스"
          value={`${avgHarness}`}
          valueColor="text-[#D4A020]"
        />
        {/* 팀 총 스킬 */}
        <StatCard icon="⚡" label="팀 총 스킬" value={`${totalSkills}`} />
        {/* 오늘 세션 */}
        <StatCard icon="📊" label="오늘 세션" value={`${todaySessions}`} />
      </div>

      {/* ── 2. 팀 비교 테이블 ── */}
      <div>
        <h2 className="text-lg font-semibold mb-3">멤버별 환경 비교</h2>
        <TeamTable rows={rows} />
      </div>

      {/* ── 3. MVP + 팀 알림 2컬럼 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 이번 주 MVP */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">
            🏆 이번 주 MVP
          </h3>
          {mvpMember && mvpSnapshot ? (
            <div className="flex items-center gap-3">
              {/* 아바타 */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: mvpMember.avatar_color }}
              >
                {mvpMember.nickname.slice(0, 1)}
              </div>
              <div>
                <div className="font-semibold">{mvpMember.nickname}</div>
                <div className="text-xs text-gray-500 space-x-2">
                  <span>
                    하네스{' '}
                    <span className="font-semibold text-[#D4A020]">
                      {mvpSnapshot.harness_score}
                    </span>
                  </span>
                  <span>스킬 {mvpSnapshot.skill_count}</span>
                  <span>에이전트 {mvpSnapshot.agent_count}</span>
                  <span>도구 {mvpSnapshot.mcp_count + mvpSnapshot.plugin_count}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">데이터 없음</div>
          )}
        </div>

        {/* 팀 알림 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">
            📢 팀 알림
          </h3>
          {alerts.length > 0 ? (
            <ul className="space-y-2">
              {alerts.map((alert, i) => (
                <li key={i} className="text-sm text-gray-700">
                  {alert}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-400">알림 없음</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 통계 카드 내부 컴포넌트 ─────────────────────

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}

/**
 * 상단 통계 카드 (아이콘 + 라벨 + 숫자)
 */
function StatCard({ icon, label, value, sub, valueColor }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="text-xs text-gray-400 mb-1">
        {icon} {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={`text-2xl font-bold ${valueColor ?? 'text-gray-900'}`}
        >
          {value}
        </span>
        {sub && <span className="text-sm text-gray-400">{sub}</span>}
      </div>
    </div>
  );
}
