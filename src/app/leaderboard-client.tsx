'use client';

import { useState, useMemo } from 'react';
import type { Member, DailyUsage, RankedMember, PeriodFilter, MetricTab, DateRange } from '@/lib/types';
import PeriodFilterBar from '@/components/period-filter';
import MetricTabBar from '@/components/metric-tab';
import TopCards from '@/components/top-cards';
import RankingTable from '@/components/ranking-table';

interface LeaderboardClientProps {
  members: Member[];
  dailyUsage: DailyUsage[];
}

/**
 * 리더보드 클라이언트 컴포넌트
 * 서버에서 받은 원본 데이터를 기간/지표 기준으로 집계하여 순위를 계산하고 표시
 */
export default function LeaderboardClient({ members, dailyUsage }: LeaderboardClientProps) {
  // 기간 필터 상태 (기본: 30일)
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  // 지표 탭 상태 (기본: 토큰)
  const [metric, setMetric] = useState<MetricTab>('tokens');
  // 사용자 지정 날짜 범위 (기본: 최근 30일)
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 29);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  });

  // 순위 계산: 기간 필터링 → 멤버별 집계 → 지표 기준 정렬 → 순위 부여
  const ranked = useMemo(() => {
    // 1. 기간에 따라 사용량 데이터 필터링
    const filtered = filterByPeriod(dailyUsage, period, dateRange);

    // 2. 이전 기간 데이터 (순위 변동 비교용)
    const prevFiltered = filterByPrevPeriod(dailyUsage, period, dateRange);

    // 3. 멤버별로 사용량 집계
    const aggregated = aggregateByMember(filtered, members);
    const prevAggregated = aggregateByMember(prevFiltered, members);

    // 4. 선택된 지표 기준으로 정렬
    const sorted = sortByMetric(aggregated, metric);
    const prevSorted = sortByMetric(prevAggregated, metric);

    // 5. 이전 기간 순위 매핑 (순위 변동 계산용)
    const prevRankMap = new Map<string, number>();
    prevSorted.forEach((m, i) => prevRankMap.set(m.member_id, i + 1));

    // 6. 최종 순위 부여 + 이전 순위 첨부
    return sorted.map((m, i): RankedMember => ({
      ...m,
      rank: i + 1,
      prev_rank: prevRankMap.get(m.member_id) ?? null,
    }));
  }, [members, dailyUsage, period, metric, dateRange]);

  return (
    <div className="space-y-6">
      {/* 필터 영역: 기간 필터 + 지표 탭 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodFilterBar
          value={period}
          onChange={setPeriod}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
        <MetricTabBar value={metric} onChange={setMetric} />
      </div>

      {/* 상위 3명 카드 */}
      <TopCards members={ranked} metric={metric} />

      {/* 전체 순위 테이블 */}
      <RankingTable members={ranked} />
    </div>
  );
}

/**
 * 기간 필터에 따라 사용량 데이터를 필터링
 * '7d': 최근 7일, '14d': 최근 14일, '30d': 최근 30일, 'all': 전체, 'custom': 사용자 지정 범위
 */
function filterByPeriod(usage: DailyUsage[], period: PeriodFilter, dateRange?: DateRange): DailyUsage[] {
  if (period === 'all') return usage;

  if (period === 'custom' && dateRange) {
    return usage.filter((u) => u.date >= dateRange.start && u.date <= dateRange.end);
  }

  const days = period === '7d' ? 7 : period === '14d' ? 14 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  return usage.filter((u) => u.date >= cutoffStr);
}

/**
 * 이전 기간 데이터 필터링 (순위 변동 비교용)
 * 예: 현재 7일이면 그 이전 7일 데이터를 가져옴
 * custom: 같은 기간 길이만큼 이전 기간을 계산
 */
function filterByPrevPeriod(usage: DailyUsage[], period: PeriodFilter, dateRange?: DateRange): DailyUsage[] {
  if (period === 'all') return usage;

  if (period === 'custom' && dateRange) {
    // 사용자 지정 범위의 기간 길이 계산
    const startMs = new Date(dateRange.start).getTime();
    const endMs = new Date(dateRange.end).getTime();
    const durationMs = endMs - startMs;
    // 이전 기간: start - duration ~ start - 1일
    const prevEnd = new Date(startMs - 86400000); // 시작일 하루 전
    const prevStart = new Date(prevEnd.getTime() - durationMs);
    const prevStartStr = prevStart.toISOString().split('T')[0];
    const prevEndStr = prevEnd.toISOString().split('T')[0];
    return usage.filter((u) => u.date >= prevStartStr && u.date <= prevEndStr);
  }

  const days = period === '7d' ? 7 : period === '14d' ? 14 : 30;
  const now = new Date();
  const cutoffEnd = new Date();
  cutoffEnd.setDate(now.getDate() - days);
  const cutoffStart = new Date();
  cutoffStart.setDate(now.getDate() - days * 2);

  const startStr = cutoffStart.toISOString().split('T')[0];
  const endStr = cutoffEnd.toISOString().split('T')[0];

  return usage.filter((u) => u.date >= startStr && u.date < endStr);
}

/**
 * 멤버별로 사용량 합산 집계
 * member_id 기준으로 토큰, 비용, 세션 수를 모두 합산
 */
function aggregateByMember(
  usage: DailyUsage[],
  members: Member[]
): Omit<RankedMember, 'rank' | 'prev_rank'>[] {
  // 멤버 정보를 빠르게 찾기 위한 맵
  const memberMap = new Map(members.map((m) => [m.id, m]));

  // member_id별 합산
  const agg = new Map<string, { tokens: number; cost: number; sessions: number }>();
  for (const u of usage) {
    const prev = agg.get(u.member_id) ?? { tokens: 0, cost: 0, sessions: 0 };
    agg.set(u.member_id, {
      tokens: prev.tokens + u.total_tokens,
      cost: prev.cost + u.cost_usd,
      sessions: prev.sessions + u.session_count,
    });
  }

  // 집계 결과를 RankedMember 형태로 변환
  return members.map((m) => {
    const data = agg.get(m.id) ?? { tokens: 0, cost: 0, sessions: 0 };
    return {
      member_id: m.id,
      nickname: m.nickname,
      avatar_color: m.avatar_color,
      total_tokens: data.tokens,
      cost_usd: data.cost,
      session_count: data.sessions,
    };
  });
}

/**
 * 선택된 지표 기준으로 내림차순 정렬
 */
function sortByMetric(
  items: Omit<RankedMember, 'rank' | 'prev_rank'>[],
  metric: MetricTab
): Omit<RankedMember, 'rank' | 'prev_rank'>[] {
  return [...items].sort((a, b) => {
    switch (metric) {
      case 'tokens':
        return b.total_tokens - a.total_tokens;
      case 'cost':
        return b.cost_usd - a.cost_usd;
      case 'sessions':
        return b.session_count - a.session_count;
    }
  });
}
