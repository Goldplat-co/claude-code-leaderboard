'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { RankedMember } from '@/lib/types';
import { AnimatedNumber } from './animated-number';

interface RankingTableProps {
  members: RankedMember[];
}

/**
 * 전체 순위 테이블
 * 컬럼: 순위 | 닉네임 | 토큰 | 환산 비용 | 세션 수
 * 하단에 팀 합계 표시
 * 행 클릭 시 해당 멤버 프로필 페이지로 이동
 * 정렬 변경 시 행이 부드럽게 재배치됨 (AnimatePresence + layout)
 */
export default function RankingTable({ members }: RankingTableProps) {
  const router = useRouter();

  // 팀 전체 합계 계산
  const totals = members.reduce(
    (acc, m) => ({
      tokens: acc.tokens + m.total_tokens,
      cost: acc.cost + m.cost_usd,
      sessions: acc.sessions + m.session_count,
    }),
    { tokens: 0, cost: 0, sessions: 0 }
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        {/* 테이블 헤더 */}
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
            <th className="px-4 py-3 font-medium w-16">순위</th>
            <th className="px-4 py-3 font-medium">닉네임</th>
            <th className="px-4 py-3 font-medium text-right">토큰</th>
            <th className="px-4 py-3 font-medium text-right">환산 비용</th>
            <th className="px-4 py-3 font-medium text-right">세션 수</th>
          </tr>
        </thead>

        {/* 테이블 본문: 각 멤버별 행 (정렬 변경 시 부드럽게 이동) */}
        <AnimatePresence mode="popLayout">
          <tbody>
            {members.map((member) => {
              const rankChange = getRankChange(member);
              return (
                <motion.tr
                  key={member.member_id}
                  layout
                  // 호버 시 골드 톤 미세 배경색
                  whileHover={{ backgroundColor: 'rgba(212, 160, 32, 0.04)' }}
                  // 새 행 등장/퇴장 애니메이션
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  onClick={() =>
                    router.push(
                      `/profile/${encodeURIComponent(member.nickname)}`
                    )
                  }
                  className="border-b border-gray-100 transition-colors cursor-pointer"
                >
                  {/* 순위 + 변동 화살표 */}
                  <td className="px-4 py-3 font-medium">
                    <span className="tabular-nums">{member.rank}</span>
                    {rankChange && (
                      <span
                        className={`ml-1 text-xs ${
                          rankChange.direction === 'up'
                            ? 'text-green-600'
                            : 'text-red-500'
                        }`}
                      >
                        {rankChange.direction === 'up' ? '▲' : '▼'}
                        {rankChange.diff}
                      </span>
                    )}
                  </td>

                  {/* 닉네임 + 아바타 색상 점 */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: member.avatar_color }}
                      />
                      <span className="font-medium">{member.nickname}</span>
                    </div>
                  </td>

                  {/* 토큰 수 (애니메이션 카운팅) */}
                  <td className="px-4 py-3 text-right tabular-nums">
                    <AnimatedNumber value={member.total_tokens} />
                  </td>

                  {/* 환산 비용 ($) (애니메이션 카운팅) */}
                  <td className="px-4 py-3 text-right tabular-nums">
                    <AnimatedNumber
                      value={member.cost_usd}
                      format={(n) => `$${n.toFixed(2)}`}
                    />
                  </td>

                  {/* 세션 수 (애니메이션 카운팅) */}
                  <td className="px-4 py-3 text-right tabular-nums">
                    <AnimatedNumber value={member.session_count} />
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </AnimatePresence>

        {/* 팀 합계 푸터 (애니메이션 카운팅) */}
        <tfoot>
          <tr className="bg-gold/5 font-semibold text-gold-dark">
            <td className="px-4 py-3" colSpan={2}>
              우리 팀 합계
            </td>
            <td className="px-4 py-3 text-right tabular-nums">
              <AnimatedNumber value={totals.tokens} />
            </td>
            <td className="px-4 py-3 text-right tabular-nums">
              <AnimatedNumber
                value={totals.cost}
                format={(n) => `$${n.toFixed(2)}`}
              />
            </td>
            <td className="px-4 py-3 text-right tabular-nums">
              <AnimatedNumber value={totals.sessions} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * 순위 변동 계산 (이전 순위와 비교)
 */
function getRankChange(member: RankedMember) {
  if (member.prev_rank === null) return null;
  const diff = member.prev_rank - member.rank;
  if (diff === 0) return null;
  return {
    direction: diff > 0 ? ('up' as const) : ('down' as const),
    diff: Math.abs(diff),
  };
}
