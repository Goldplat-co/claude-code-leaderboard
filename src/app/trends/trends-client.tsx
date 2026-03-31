'use client';

import { useState, useMemo } from 'react';
import type { Member, DailyUsage, PeriodFilter, MetricTab, DateRange } from '@/lib/types';
import MemberFilter from '@/components/member-filter';
import PeriodFilterBar from '@/components/period-filter';
import MetricTabBar from '@/components/metric-tab';
import TrendChart from '@/components/trend-chart';

interface TrendsClientProps {
  members: Member[];
  usage: DailyUsage[];
}

/**
 * 기간 필터 값에 따라 시작일 계산
 * '7d' → 7일 전, '14d' → 14일 전, '30d' → 30일 전, 'all' → null (전체)
 * 'custom' → dateRange 사용 (이 함수에서는 null 반환)
 */
function getStartDate(period: PeriodFilter): Date | null {
  if (period === 'all' || period === 'custom') return null;
  const days = period === '7d' ? 7 : period === '14d' ? 14 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 트렌드 페이지 클라이언트 — 필터 + 차트 조합
 * MemberFilter, PeriodFilterBar, MetricTabBar, TrendChart를 하나로 조합
 */
export default function TrendsClient({ members, usage }: TrendsClientProps) {
  // 기간 필터 (기본: 최근 7일)
  const [period, setPeriod] = useState<PeriodFilter>('7d');
  // 지표 탭 (기본: 비용)
  const [metric, setMetric] = useState<MetricTab>('cost');
  // 선택된 멤버 (기본: 전체 선택)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    () => new Set(members.map((m) => m.id))
  );
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

  // 멤버 선택/해제 토글
  const handleToggle = (memberId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  // 기간 필터에 따른 시작일 (custom이면 dateRange 사용)
  const startDate = useMemo(() => {
    if (period === 'custom') {
      const d = new Date(dateRange.start);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return getStartDate(period);
  }, [period, dateRange]);

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold">
            사용량 트렌드
          </h1>
          <p className="mt-2 text-gray-500">
            일별 사용 패턴을 비교해보세요
          </p>
        </div>

        {/* 필터 바: 기간 + 지표 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PeriodFilterBar
            period={period}
            onChange={setPeriod}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <MetricTabBar metric={metric} onChange={setMetric} />
        </div>

        {/* 멤버 필터 */}
        <MemberFilter
          members={members}
          selectedMembers={selectedMembers}
          onToggle={handleToggle}
        />

        {/* 트렌드 차트 */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          <TrendChart
            members={members}
            usage={usage}
            selectedMembers={selectedMembers}
            metric={metric}
            startDate={startDate}
          />
        </div>
      </div>
    </div>
  );
}
