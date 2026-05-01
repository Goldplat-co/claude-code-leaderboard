'use client';

import Link from 'next/link';

/**
 * 팀 비교 테이블에서 사용하는 멤버 행 데이터
 * - nickname: 멤버 닉네임
 * - avatar_color: 아바타 색상 (원형 뱃지)
 * - harness_score: 하네스 점수 (0~100)
 * - skill_count ~ mcp_count: 환경 구성 수량
 * - last_snapshot_date: 마지막 스냅샷 날짜 (없으면 null)
 * - badge: 멤버 상태 뱃지
 */
export interface TeamRow {
  nickname: string;
  avatar_color: string;
  harness_score: number;
  skill_count: number;
  agent_count: number;
  hook_count: number;
  mcp_count: number;
  last_snapshot_date: string | null;
  badge: 'most-active' | 'best-setup' | 'growing' | 'starter';
}

interface TeamTableProps {
  rows: TeamRow[];
}

// 뱃지별 스타일 및 라벨 정의
const badgeConfig: Record<
  TeamRow['badge'],
  { label: string; bgClass: string; textClass: string }
> = {
  'most-active': {
    label: 'Most Active',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-800',
  },
  'best-setup': {
    label: 'Best Setup',
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
  },
  growing: {
    label: 'Growing',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-800',
  },
  starter: {
    label: 'Starter',
    bgClass: 'bg-violet-100',
    textClass: 'text-violet-800',
  },
};

/**
 * 팀 전체 멤버 비교 테이블
 * 컬럼: 멤버 | 하네스 | 스킬 | 에이전트 | Hook | MCP | 최근 활동 | 상태
 * - 하네스 컬럼: 가로 바 (80px, 골드 색상 비례 채우기) + 점수 숫자
 * - 멤버 이름 클릭 → /env/[nickname] 으로 이동
 * - 상태 컬럼: 뱃지 타입에 따라 색상이 다른 pill 표시
 */
export default function TeamTable({ rows }: TeamTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        등록된 멤버가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        {/* 테이블 헤더 */}
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
            <th className="px-4 py-3 font-medium">멤버</th>
            <th className="px-4 py-3 font-medium">하네스</th>
            <th className="px-4 py-3 font-medium text-right">스킬</th>
            <th className="px-4 py-3 font-medium text-right">에이전트</th>
            <th className="px-4 py-3 font-medium text-right">Hook</th>
            <th className="px-4 py-3 font-medium text-right">MCP</th>
            <th className="px-4 py-3 font-medium">최근 활동</th>
            <th className="px-4 py-3 font-medium">상태</th>
          </tr>
        </thead>

        {/* 테이블 본문 */}
        <tbody>
          {rows.map((row) => {
            const badge = badgeConfig[row.badge];
            return (
              <tr
                key={row.nickname}
                className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
              >
                {/* 멤버: 아바타 원 + 클릭 가능한 닉네임 */}
                <td className="px-4 py-3">
                  <Link
                    href={`/env/${encodeURIComponent(row.nickname)}`}
                    className="flex items-center gap-2 hover:text-gold-dark transition-colors"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: row.avatar_color }}
                    />
                    <span className="font-medium">{row.nickname}</span>
                  </Link>
                </td>

                {/* 하네스: 가로 바 + 점수 */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {/* 80px 너비의 바 배경 */}
                    <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                      {/* 골드 색상으로 점수 비율만큼 채움 */}
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(row.harness_score, 100)}%`,
                          backgroundColor: '#D4A020',
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-gray-700">
                      {row.harness_score}
                    </span>
                  </div>
                </td>

                {/* 스킬 수 */}
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.skill_count}
                </td>

                {/* 에이전트 수 */}
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.agent_count}
                </td>

                {/* Hook 수 */}
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.hook_count}
                </td>

                {/* MCP 수 */}
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.mcp_count}
                </td>

                {/* 최근 활동 날짜 */}
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {row.last_snapshot_date ?? '데이터 없음'}
                </td>

                {/* 상태 뱃지 */}
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badge.bgClass} ${badge.textClass}`}
                  >
                    {badge.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
