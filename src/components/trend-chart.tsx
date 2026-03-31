'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { Member, DailyUsage, MetricTab, TrendPoint } from '@/lib/types';

interface TrendChartProps {
  /** 전체 팀원 목록 */
  members: Member[];
  /** 일별 사용량 데이터 */
  usage: DailyUsage[];
  /** 현재 선택된 멤버 ID Set */
  selectedMembers: Set<string>;
  /** 표시할 지표 (tokens / cost / sessions) */
  metric: MetricTab;
  /** 기간 필터 시작일 (null이면 전체) */
  startDate: Date | null;
}

/**
 * 지표값을 읽기 쉬운 형태로 포맷
 * - tokens: 1K, 1.2M 등 축약
 * - cost: $0.05 형태
 * - sessions: 정수
 */
function formatValue(value: number, metric: MetricTab): string {
  if (metric === 'cost') {
    return `$${value.toFixed(2)}`;
  }
  if (metric === 'sessions') {
    return value.toLocaleString();
  }
  // tokens
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

/**
 * DailyUsage 배열에서 해당 metric 값을 추출
 */
function getMetricValue(row: DailyUsage, metric: MetricTab): number {
  switch (metric) {
    case 'tokens':
      return row.total_tokens;
    case 'cost':
      return row.cost_usd;
    case 'sessions':
      return row.session_count;
  }
}

/**
 * usage 데이터를 날짜별로 그룹핑하여 TrendPoint 배열로 변환
 * 각 TrendPoint에는 date와 멤버별 nickname 키로 값이 들어감
 */
function buildTrendData(
  usage: DailyUsage[],
  members: Member[],
  selectedMembers: Set<string>,
  metric: MetricTab,
  startDate: Date | null
): TrendPoint[] {
  // member_id → nickname 매핑
  const idToNickname = new Map<string, string>();
  members.forEach((m) => idToNickname.set(m.id, m.nickname));

  // 시작일 이후 + 선택된 멤버만 필터
  const filtered = usage.filter((row) => {
    if (!selectedMembers.has(row.member_id)) return false;
    if (startDate && new Date(row.date) < startDate) return false;
    return true;
  });

  // 날짜별 그룹핑
  const dateMap = new Map<string, TrendPoint>();
  filtered.forEach((row) => {
    const dateKey = row.date;
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { date: dateKey });
    }
    const point = dateMap.get(dateKey)!;
    const nickname = idToNickname.get(row.member_id) ?? row.member_id;
    point[nickname] = getMetricValue(row, metric);
  });

  // 날짜 오름차순 정렬
  return Array.from(dateMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * 날짜를 MM/DD 형태로 포맷
 */
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

/**
 * 커스텀 툴팁 — 호버 시 날짜 + 멤버별 값 표시
 */
function CustomTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  metric: MetricTab;
}) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
      <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-zinc-700 dark:text-zinc-300">{entry.name}</span>
          <span className="ml-auto font-mono font-semibold text-zinc-900 dark:text-zinc-100">
            {formatValue(entry.value, metric)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * 트렌드 차트 — Recharts LineChart
 * 선택된 멤버별로 라인을 그리며, 각 멤버의 avatar_color 사용
 */
export default function TrendChart({
  members,
  usage,
  selectedMembers,
  metric,
  startDate,
}: TrendChartProps) {
  const data = buildTrendData(usage, members, selectedMembers, metric, startDate);

  // 선택된 멤버만 라인으로 표시
  const activeMembers = members.filter((m) => selectedMembers.has(m.id));

  // 데이터 없을 때 빈 상태
  if (data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
        <p className="text-zinc-400 dark:text-zinc-500">
          선택한 기간에 데이터가 없어요
        </p>
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#27272a"
            opacity={0.3}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            tick={{ fontSize: 12, fill: '#a1a1aa' }}
            axisLine={{ stroke: '#3f3f46' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatValue(v, metric)}
            tick={{ fontSize: 12, fill: '#a1a1aa' }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            content={
              <CustomTooltip metric={metric} />
            }
          />
          {activeMembers.map((member) => (
            <Line
              key={member.id}
              type="monotone"
              dataKey={member.nickname}
              stroke={member.avatar_color}
              strokeWidth={2.5}
              dot={{ r: 3, fill: member.avatar_color }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
