'use client';

/**
 * RepoRow — 단일 레포의 활동 현황을 한 줄로 표시
 *
 * 왼쪽: 레포 이름 (비공개면 잠금 아이콘) + 상태 뱃지 + 설명 + 마지막 커밋 시각
 * 오른쪽: 커밋 수, PR 수, 기여자 목록
 */

interface RepoRowProps {
  repoName: string;
  visibility: string;
  description: string;
  lastCommitAt: string | null;
  status: string; // 'active' | 'moderate' | 'inactive' | 'archived'
  commitCount: number; // 이번 주 총 커밋 수
  prCount: number;
  contributors: string[]; // 기여자 닉네임 목록
}

// 상태별 뱃지 스타일 및 라벨
const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: '활발', bg: 'bg-green-100', text: 'text-green-800' },
  moderate: { label: '보통', bg: 'bg-blue-100', text: 'text-blue-800' },
  inactive: { label: '비활성', bg: 'bg-red-100', text: 'text-red-800' },
  archived: { label: '아카이브', bg: 'bg-gray-100', text: 'text-gray-600' },
};

/**
 * 날짜 문자열을 "N분 전", "N시간 전", "어제", "N일 전" 형태로 변환
 */
function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '기록 없음';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '어제';
  return `${days}일 전`;
}

export default function RepoRow({
  repoName,
  visibility,
  description,
  lastCommitAt,
  status,
  commitCount,
  prCount,
  contributors,
}: RepoRowProps) {
  const badge = statusConfig[status] ?? statusConfig.inactive;
  const isPrivate = visibility === 'private';

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors px-4">
      {/* 왼쪽: 레포 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {/* 레포 이름 + 비공개 아이콘 */}
          <span className="font-medium text-sm text-gray-900 truncate">
            {isPrivate && <span title="Private">&#x1F512; </span>}
            {repoName}
          </span>

          {/* 상태 뱃지 */}
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
          >
            {badge.label}
          </span>
        </div>

        {/* 설명 + 마지막 커밋 시각 */}
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {description || '설명 없음'}
          <span className="mx-1.5 text-gray-300">|</span>
          마지막 커밋: {relativeTime(lastCommitAt)}
        </p>
      </div>

      {/* 오른쪽: 커밋/PR 수 + 기여자 */}
      <div className="flex items-center gap-4 shrink-0 ml-4">
        {/* 커밋 수 */}
        <div className="text-right">
          <span className="text-sm font-semibold tabular-nums text-gray-800">
            {commitCount}
          </span>
          <span className="text-xs text-gray-500 ml-1">커밋</span>
        </div>

        {/* PR 수 */}
        <div className="text-right">
          <span className="text-sm font-semibold tabular-nums text-gray-800">
            {prCount}
          </span>
          <span className="text-xs text-gray-500 ml-1">PR</span>
        </div>

        {/* 기여자 목록 */}
        <div className="text-xs text-gray-500 w-28 text-right truncate">
          {contributors.length > 0 ? contributors.join(', ') : '-'}
        </div>
      </div>
    </div>
  );
}
