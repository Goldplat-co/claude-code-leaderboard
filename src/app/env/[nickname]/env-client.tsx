'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Member, EnvSnapshot } from '@/lib/types';
import { calculateHarness } from '@/lib/harness';
import HarnessRing from '@/components/harness-ring';
import CheckList from '@/components/check-list';
import EnvStatCards from '@/components/env-stat-cards';

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────
interface EnvClientProps {
  /** 최신 환경 스냅샷 (없으면 null) */
  snapshot: EnvSnapshot | null;
  /** 스냅샷 히스토리 (최신 순, 최대 30개) */
  history: EnvSnapshot[];
  /** 현재 멤버 정보 */
  member: Member;
  /** 전체 멤버 목록 (드롭다운 선택용) */
  allMembers: Member[];
}

// ──────────────────────────────────────────────
// 유틸 함수
// ──────────────────────────────────────────────

/** 날짜를 MM/DD 형태로 포맷 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

// ──────────────────────────────────────────────
// 커스텀 툴팁
// ──────────────────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="mb-1 text-xs text-gray-400">{label}</p>
      <p className="text-lg font-bold" style={{ color: '#D4A020' }}>
        {payload[0].value}점
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────────
export default function EnvClient({
  snapshot,
  history,
  member,
  allMembers,
}: EnvClientProps) {
  const router = useRouter();

  // 하네스 체크 결과 계산 (최신 스냅샷 기반)
  const harnessResult = useMemo(() => {
    if (!snapshot) return null;
    return calculateHarness({
      claude_md_content: snapshot.claude_md_content ?? '',
      skills: snapshot.skills_json ?? [],
      agents: snapshot.agents_json ?? [],
      hooks: snapshot.hooks_json ?? [],
      mcp_connectors: snapshot.mcp_json ?? [],
      plugins: snapshot.plugins_json ?? [],
      settings: snapshot.settings_json ?? {},
    });
  }, [snapshot]);

  // 이전 스냅샷 (직전 날짜)
  const prevSnapshot = history.length > 1 ? history[1] : null;

  // 차트 데이터: 히스토리를 날짜 오름차순으로 변환
  const chartData = useMemo(() => {
    return [...history]
      .reverse()
      .map((s) => ({
        date: formatDate(s.date),
        score: s.harness_score,
      }));
  }, [history]);

  // 멤버 선택 변경 핸들러
  const handleMemberChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nickname = e.target.value;
    router.push(`/env/${encodeURIComponent(nickname)}`);
  };

  // ── 데이터 없을 때 ──
  if (!snapshot) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* 멤버 선택 드롭다운 */}
        <div className="mb-8">
          <select
            value={member.nickname}
            onChange={handleMemberChange}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm focus:border-[#D4A020] focus:outline-none focus:ring-1 focus:ring-[#D4A020]"
          >
            {allMembers.map((m) => (
              <option key={m.id} value={m.nickname}>
                {m.nickname}
              </option>
            ))}
          </select>
        </div>

        <div className="text-center py-20">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">
            아직 환경 데이터가 없습니다
          </h2>
          <p className="text-gray-400">
            snapshot.sh를 실행하면 환경 설정 현황이 여기에 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  // ── 메인 레이아웃 ──
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* 상단: 멤버 선택 드롭다운 + 페이지 타이틀 */}
      <div className="flex items-center gap-4 mb-8">
        <select
          value={member.nickname}
          onChange={handleMemberChange}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm focus:border-[#D4A020] focus:outline-none focus:ring-1 focus:ring-[#D4A020]"
        >
          {allMembers.map((m) => (
            <option key={m.id} value={m.nickname}>
              {m.nickname}
            </option>
          ))}
        </select>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">환경 점검</h1>
          <p className="text-sm text-gray-400">
            마지막 수집: {snapshot.date}
          </p>
        </div>
      </div>

      {/* 2컬럼 그리드: 좌=하네스링+체크리스트, 우=통계카드+스킬칩 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* ── 왼쪽 컬럼 ── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">하네스 점수</h2>
          <HarnessRing score={harnessResult?.score ?? 0} />
          {harnessResult && <CheckList checks={harnessResult.checks} />}
        </div>

        {/* ── 오른쪽 컬럼 ── */}
        <div className="space-y-6">
          {/* 통계 카드 */}
          <EnvStatCards snapshot={snapshot} prevSnapshot={prevSnapshot} />

          {/* 스킬 칩 그리드 */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              설치된 스킬
              <span className="ml-2 text-sm font-normal text-gray-400">
                {snapshot.skills_json?.length ?? 0}개
              </span>
            </h2>
            {snapshot.skills_json && snapshot.skills_json.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {snapshot.skills_json.map((skill) => (
                  <span
                    key={skill.name}
                    className="inline-flex items-center rounded-full bg-[#D4A020]/10 px-3 py-1 text-xs font-medium text-[#B8860B]"
                    title={skill.description}
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">등록된 스킬이 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      {/* 하단: 히스토리 차트 (전체 폭) */}
      {chartData.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            하네스 점수 추이
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 16, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4A020" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#D4A020" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#D4A020"
                  strokeWidth={2.5}
                  fill="url(#goldGradient)"
                  dot={{ r: 3, fill: '#D4A020' }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
