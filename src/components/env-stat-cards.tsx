'use client';

import type { EnvSnapshot } from '@/lib/types';

/**
 * 환경 스냅샷 통계 카드 (2x2 그리드)
 * 스킬/에이전트/Hook/MCP 각 카운트를 표시하고, 이전 스냅샷 대비 변화량 표시
 * - snapshot: 현재 스냅샷
 * - prevSnapshot: 이전 스냅샷 (비교용, 없으면 변화량 미표시)
 */

interface Props {
  snapshot: EnvSnapshot;
  prevSnapshot?: EnvSnapshot | null;
}

const items = [
  { key: 'skill_count' as const, label: '스킬' },
  { key: 'agent_count' as const, label: '에이전트' },
  { key: 'hook_count' as const, label: 'Hook' },
  { key: 'mcp_count' as const, label: 'MCP' },
] as const;

export default function EnvStatCards({ snapshot, prevSnapshot }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map(({ key, label }) => {
        const current = snapshot[key];
        const prev = prevSnapshot?.[key];
        const diff = prev != null ? current - prev : null;

        return (
          <div
            key={key}
            className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
          >
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className="text-2xl font-bold">{current}</div>
            {diff !== null && diff !== 0 && (
              <div
                className={`text-xs font-semibold mt-1 ${
                  diff > 0 ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {diff > 0 ? '+' : ''}
                {diff} vs 이전
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
