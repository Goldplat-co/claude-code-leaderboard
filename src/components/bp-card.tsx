'use client';

/**
 * BpCard (Best Practice Card)
 *
 * 팀원의 Claude Code 설정(CLAUDE.md, 스킬, Hook, 에이전트, MCP)을
 * 미리보기 카드 형태로 보여주는 컴포넌트.
 *
 * - 호버 시 골드 테두리 + 미세한 골드 그림자
 * - 코드 미리보기: 다크 배경 + 모노스페이스, 하단 그라데이션 페이드
 * - 추천 뱃지: 하네스 85점 이상이면 자동 표시
 */

// 카테고리 타입 (어떤 종류의 설정인지)
type BpType = 'claude-md' | 'skill' | 'hook' | 'agent' | 'mcp';

interface BpCardProps {
  nickname: string;       // 멤버 닉네임
  avatarColor: string;    // 아바타 배경색
  harnessScore: number;   // 하네스 점수
  type: BpType;           // 카드 카테고리
  title: string;          // 카드 제목 (예: "진영의 CLAUDE.md")
  preview: string;        // 코드/콘텐츠 미리보기 텍스트
  meta: string;           // 메타 정보 (예: "124줄")
  updatedDate: string;    // 업데이트 날짜 (예: "오늘", "2일 전")
  isRecommended: boolean; // 추천 여부 (harness >= 85)
}

// 카테고리별 뱃지 라벨 매핑
const typeBadge: Record<BpType, string> = {
  'claude-md': 'CLAUDE.md',
  skill: '스킬',
  hook: 'Hook',
  agent: '에이전트',
  mcp: 'MCP',
};

export default function BpCard({
  nickname,
  avatarColor,
  type,
  title,
  preview,
  meta,
  updatedDate,
  isRecommended,
}: BpCardProps) {
  return (
    <div
      className="
        bg-white border border-gray-200 rounded-xl shadow-sm
        transition-all duration-200
        hover:border-[#D4A020] hover:shadow-[0_2px_12px_rgba(212,160,32,0.15)]
        flex flex-col overflow-hidden
      "
    >
      {/* ── 헤더: 아바타 + 제목 + 뱃지 ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* 아바타 원형 */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {nickname.slice(0, 1)}
          </div>
          {/* 제목 (말줄임) */}
          <span className="text-sm font-semibold text-gray-900 truncate">
            {title}
          </span>
        </div>

        {/* 뱃지: 추천이면 골드 별, 아니면 카테고리 뱃지 */}
        {isRecommended ? (
          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-[#D4A020] bg-[#D4A020]/10 px-2 py-0.5 rounded-full">
            ⭐ 추천
          </span>
        ) : (
          <span className="shrink-0 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {typeBadge[type]}
          </span>
        )}
      </div>

      {/* ── 코드 미리보기: 다크 배경 + 모노스페이스 ── */}
      <div className="relative mx-4 rounded-lg overflow-hidden">
        <pre className="bg-[#1e1e1e] text-[#d4d4d4] text-xs font-mono px-3 py-2.5 overflow-hidden max-h-[120px] whitespace-pre-wrap break-all leading-relaxed">
          {preview || '(내용 없음)'}
        </pre>
        {/* 하단 그라데이션 페이드 (코드가 잘리는 것을 부드럽게 표시) */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#1e1e1e] to-transparent pointer-events-none" />
      </div>

      {/* ── 푸터: 메타 정보 + 날짜 ── */}
      <div className="flex items-center justify-between px-4 py-3 text-xs text-gray-400">
        <span>{meta}</span>
        <span>{updatedDate}</span>
      </div>
    </div>
  );
}
