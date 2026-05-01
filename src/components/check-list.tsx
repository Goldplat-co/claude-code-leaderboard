'use client';

import type { HarnessCheck } from '@/lib/types';

/**
 * 하네스 체크 항목 리스트
 * 각 항목의 통과/부분/실패 상태를 컬러 아이콘으로 표시
 * - checks: HarnessCheck 배열 (7개 항목)
 */

interface Props {
  checks: HarnessCheck[];
}

export default function CheckList({ checks }: Props) {
  return (
    <ul className="divide-y divide-gray-100">
      {checks.map((check) => {
        // 통과: 초록, 부분 점수: 앰버, 실패: 빨강
        const colorClass = check.passed
          ? 'text-green-600'
          : check.points > 0
            ? 'text-amber-500'
            : 'text-red-500';
        const icon = check.passed ? '✓' : check.points > 0 ? '!' : '✗';

        return (
          <li key={check.label} className="flex items-center gap-3 py-3 text-sm">
            <span className={`font-semibold ${colorClass}`}>{icon}</span>
            <span className="text-gray-700">{check.label}</span>
            <span className={`ml-auto text-xs font-semibold ${colorClass}`}>
              {check.detail}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
