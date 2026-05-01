'use client';

/**
 * 하네스 점수를 원형 프로그레스 링으로 표시하는 컴포넌트
 * conic-gradient CSS로 골드 색상 비율을 표현
 * - score: 0~100 점수
 */

interface Props {
  score: number;
}

export default function HarnessRing({ score }: Props) {
  // 0~100 범위로 클램핑
  const pct = Math.max(0, Math.min(100, score));

  return (
    <div
      className="w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-4"
      style={{
        background: `conic-gradient(#D4A020 0% ${pct}%, #e5e7eb ${pct}% 100%)`,
      }}
    >
      {/* 안쪽 흰 원 — 도넛 모양 만들기 */}
      <div className="w-[104px] h-[104px] rounded-full bg-white flex items-center justify-center flex-col">
        <span className="text-3xl font-bold" style={{ color: '#D4A020' }}>
          {score}
        </span>
        <span className="text-xs text-gray-400">/ 100</span>
      </div>
    </div>
  );
}
