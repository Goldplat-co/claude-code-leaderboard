'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Member, DailyUsage } from '@/lib/types';

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────
interface ProfileClientProps {
  member: Member;
  usage: DailyUsage[];
  rank: number;
  totalMembers: number;
}

// ──────────────────────────────────────────────
// 기간 필터 타입
// ──────────────────────────────────────────────
type Period = '7d' | '30d' | 'all';

// ──────────────────────────────────────────────
// 유틸 함수들
// ──────────────────────────────────────────────

/** 큰 숫자를 K/M/B 접미사로 포맷 */
function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

/** 달러 포맷: $1,234.56 */
function formatUSD(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 날짜를 한국어 형식으로 포맷: 2026년 3월 25일 */
function formatDateKR(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 날짜를 MM/DD 형식으로 포맷 */
function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// ──────────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────────
export default function ProfileClient({ member, usage, rank, totalMembers }: ProfileClientProps) {
  // 기간 필터 상태 (기본: 전체)
  const [period, setPeriod] = useState<Period>('all');

  // 기간에 따라 필터링된 사용량 데이터
  const filteredUsage = useMemo(() => {
    if (period === 'all') return usage;

    const days = period === '7d' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    return usage.filter((u) => u.date >= cutoffStr);
  }, [usage, period]);

  // ── 집계 통계 ──
  const stats = useMemo(() => {
    const totalCost = usage.reduce((sum, u) => sum + Number(u.cost_usd), 0);
    const totalTokens = usage.reduce((sum, u) => sum + Number(u.total_tokens), 0);
    const totalInputTokens = usage.reduce((sum, u) => sum + Number(u.input_tokens), 0);
    const totalOutputTokens = usage.reduce((sum, u) => sum + Number(u.output_tokens), 0);
    const activeDays = new Set(usage.map((u) => u.date)).size;
    const avgCostPerDay = activeDays > 0 ? totalCost / activeDays : 0;
    const avgTokensPerDay = activeDays > 0 ? totalTokens / activeDays : 0;

    // 최고 비용 날 찾기
    let maxCostDay = { date: '-', cost: 0 };
    usage.forEach((u) => {
      const cost = Number(u.cost_usd);
      if (cost > maxCostDay.cost) {
        maxCostDay = { date: u.date, cost };
      }
    });

    // 마지막 업데이트 날짜
    const lastUpdate = usage.length > 0 ? usage[usage.length - 1].date : '-';

    return {
      totalCost,
      totalTokens,
      totalInputTokens,
      totalOutputTokens,
      activeDays,
      avgCostPerDay,
      avgTokensPerDay,
      maxCostDay,
      lastUpdate,
      submissionCount: usage.length,
    };
  }, [usage]);

  // ── 차트 데이터 (기간 필터 적용) ──
  const chartData = useMemo(() => {
    return filteredUsage.map((u) => ({
      date: formatDateShort(u.date),
      fullDate: u.date,
      cost: Number(u.cost_usd),
    }));
  }, [filteredUsage]);

  // 토큰 비율 (프로그레스 바용)
  const inputRatio =
    stats.totalTokens > 0 ? (stats.totalInputTokens / stats.totalTokens) * 100 : 0;
  const outputRatio =
    stats.totalTokens > 0 ? (stats.totalOutputTokens / stats.totalTokens) * 100 : 0;

  // 멤버의 accent 색상
  const accent = member.avatar_color || '#D4A020';

  // 카드 애니메이션 설정
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' as const },
    }),
  };

  return (
    <div className="space-y-6">
      {/* ── 뒤로가기 링크 ── */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <span>&larr;</span>
        <span>리더보드로 돌아가기</span>
      </Link>

      {/* ── 헤더 영역 ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-4"
      >
        {/* 아바타 컬러 도트 */}
        <div
          className="w-14 h-14 rounded-full shrink-0"
          style={{ backgroundColor: accent }}
        />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{member.nickname}</h1>
          <p className="text-sm text-gray-500">
            가입일: {formatDateKR(member.created_at)}
          </p>
        </div>
      </motion.div>

      {/* ── 4개 요약 카드 (모바일 2x2, 데스크톱 4x1) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: '총 환산 비용',
            value: formatUSD(stats.totalCost),
            sub: `${formatUSD(stats.avgCostPerDay)}/일 평균`,
          },
          {
            label: '총 토큰',
            value: formatNumber(stats.totalTokens),
            sub: `${formatNumber(stats.avgTokensPerDay)}/일`,
          },
          {
            label: '활동 일수',
            value: `${stats.activeDays}일`,
            sub: `${stats.submissionCount}개 제출`,
          },
          {
            label: '순위',
            value: `#${rank}`,
            sub: `${totalMembers}명 중 전체 순위`,
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="bg-white border border-gray-200 rounded-xl p-5"
          >
            <p className="text-xs font-medium text-gray-500 mb-1">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── 일별 사용량 차트 ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="bg-white border border-gray-200 rounded-xl p-5"
      >
        {/* 차트 헤더 + 기간 필터 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">일별 사용량</h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {(
              [
                { key: '7d', label: '7일' },
                { key: '30d', label: '30일' },
                { key: 'all', label: '전체' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  period === opt.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Area 차트 */}
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                {/* 그라데이션: 멤버의 accent 색상 사용 */}
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value) => [formatUSD(Number(value ?? 0)), '비용']}
                labelFormatter={(label) => `날짜: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="cost"
                stroke={accent}
                strokeWidth={2}
                fill="url(#areaGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
            해당 기간에 데이터가 없습니다
          </div>
        )}
      </motion.div>

      {/* ── 하단 2열: 토큰 분석 + 사용 인사이트 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 토큰 분석 (Token Breakdown) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="bg-white border border-gray-200 rounded-xl p-5"
        >
          <h2 className="text-base font-semibold text-gray-900 mb-4">토큰 분석</h2>
          <div className="space-y-4">
            {/* Input 토큰 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-600">Input 토큰</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatNumber(stats.totalInputTokens)}
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${inputRatio}%`,
                    backgroundColor: accent,
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{inputRatio.toFixed(1)}%</p>
            </div>

            {/* Output 토큰 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-600">Output 토큰</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatNumber(stats.totalOutputTokens)}
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${outputRatio}%`,
                    backgroundColor: accent,
                    opacity: 0.7,
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{outputRatio.toFixed(1)}%</p>
            </div>
          </div>
        </motion.div>

        {/* 사용 인사이트 (Usage Insights) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="bg-white border border-gray-200 rounded-xl p-5"
        >
          <h2 className="text-base font-semibold text-gray-900 mb-4">사용 인사이트</h2>
          <div className="space-y-3">
            {[
              {
                label: '최고 비용 날',
                value:
                  stats.maxCostDay.date !== '-'
                    ? `${formatUSD(stats.maxCostDay.cost)} (${formatDateShort(stats.maxCostDay.date)})`
                    : '-',
              },
              {
                label: '일평균 비용',
                value: formatUSD(stats.avgCostPerDay),
              },
              {
                label: '총 추적 일수',
                value: `${stats.activeDays}일`,
              },
              {
                label: '마지막 업데이트',
                value: stats.lastUpdate !== '-' ? formatDateKR(stats.lastUpdate) : '-',
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
