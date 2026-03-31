'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { RankedMember, MetricTab } from '@/lib/types';
import { AnimatedNumber } from './animated-number';

// 순위별 뱃지 이모지
const badges = ['🥇', '🥈', '🥉'];

interface TopCardsProps {
  members: RankedMember[];
  metric: MetricTab;
}

/**
 * 상위 3명을 카드 형태로 표시
 * 배치 순서: 2등(왼쪽) - 1등(가운데, 크게) - 3등(오른쪽)
 * 1등 카드에는 골드 보더 + gold-glow 애니메이션 적용
 * 각 카드 클릭 시 해당 멤버 프로필 페이지로 이동
 */
export default function TopCards({ members, metric }: TopCardsProps) {
  // 상위 3명만 추출
  const top3 = members.slice(0, 3);
  if (top3.length === 0) return null;

  // 표시 순서: 2등 → 1등 → 3등 (가운데가 1등)
  const displayOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div className="flex items-end justify-center gap-4 py-6">
      {displayOrder.map((member, idx) => {
        // 실제 순위 (1등이 가운데)
        const isFirst = member.rank === 1;
        // 순위 변동 표시 계산
        const rankChange = getRankChange(member);

        return (
          <Link
            key={member.member_id}
            href={`/profile/${encodeURIComponent(member.nickname)}`}
          >
            <motion.div
              // 아래에서 위로 올라오는 입장 애니메이션
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              // 호버 시 살짝 위로 떠오르는 효과 + 클릭 시 눌리는 효과
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              className={`flex flex-col items-center rounded-xl border p-4 cursor-pointer ${
                isFirst
                  ? 'w-44 border-2 border-gold gold-glow bg-white'
                  : 'w-36 border-gray-200 bg-white'
              }`}
            >
              {/* 순위 뱃지 */}
              <span className="text-3xl mb-1">{badges[member.rank - 1]}</span>

              {/* 닉네임 + 아바타 색상 점 */}
              <div className="flex items-center gap-1.5 mb-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: member.avatar_color }}
                />
                <span
                  className={`font-semibold truncate ${
                    isFirst ? 'text-base' : 'text-sm'
                  }`}
                >
                  {member.nickname}
                </span>
              </div>

              {/* 선택된 지표 값 표시 (애니메이션 카운팅) */}
              <AnimatedNumber
                value={getRawValue(member, metric)}
                format={(n) => formatValue(n, metric)}
                className={`font-bold tabular-nums ${
                  isFirst ? 'text-xl text-gold-dark' : 'text-lg text-gray-800'
                }`}
              />

              {/* 순위 변동 화살표 */}
              {rankChange && (
                <span
                  className={`text-xs mt-1 ${
                    rankChange.direction === 'up'
                      ? 'text-green-600'
                      : 'text-red-500'
                  }`}
                >
                  {rankChange.direction === 'up' ? '▲' : '▼'}
                  {rankChange.diff}
                </span>
              )}
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * 순위 변동 계산
 * prev_rank가 있으면 이전 순위와 비교하여 변동폭 반환
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

/**
 * 지표에 해당하는 원시 숫자 값 반환 (AnimatedNumber에 전달용)
 */
function getRawValue(member: RankedMember, metric: MetricTab): number {
  switch (metric) {
    case 'tokens':
      return member.total_tokens;
    case 'cost':
      return member.cost_usd;
    case 'sessions':
      return member.session_count;
  }
}

/**
 * 선택된 지표에 맞는 값 포맷팅
 * 토큰: 천 단위 K 표시, 비용: $소수점 2자리, 세션: 그대로
 */
function formatValue(value: number, metric: MetricTab): string {
  switch (metric) {
    case 'tokens':
      return value >= 1_000_000
        ? `${(value / 1_000_000).toFixed(1)}M`
        : value >= 1_000
          ? `${(value / 1_000).toFixed(0)}K`
          : `${Math.round(value)}`;
    case 'cost':
      return `$${value.toFixed(2)}`;
    case 'sessions':
      return `${Math.round(value)}`;
  }
}
