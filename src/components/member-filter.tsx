'use client';

import type { Member } from '@/lib/types';

interface MemberFilterProps {
  /** 전체 팀원 목록 */
  members: Member[];
  /** 현재 선택된 멤버 ID Set */
  selectedMembers: Set<string>;
  /** 멤버 선택/해제 토글 */
  onToggle: (memberId: string) => void;
}

/**
 * 팀원 필터 — 체크박스 스타일 버튼
 * 선택된 멤버는 색상 테두리 + 그림자, 미선택은 흐리게 표시
 */
export default function MemberFilter({
  members,
  selectedMembers,
  onToggle,
}: MemberFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {members.map((member) => {
        const isSelected = selectedMembers.has(member.id);

        return (
          <button
            key={member.id}
            onClick={() => onToggle(member.id)}
            className={`
              flex items-center gap-2 rounded-full px-4 py-2
              text-sm font-medium transition-all duration-200
              ${
                isSelected
                  ? 'bg-zinc-900 text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
              }
            `}
            style={
              isSelected
                ? {
                    borderWidth: '2px',
                    borderColor: member.avatar_color,
                    boxShadow: `0 0 12px ${member.avatar_color}40`,
                  }
                : {
                    borderWidth: '2px',
                    borderColor: 'transparent',
                  }
            }
          >
            {/* 색상 도트 — 멤버 고유 색상 */}
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{
                backgroundColor: member.avatar_color,
                opacity: isSelected ? 1 : 0.4,
              }}
            />
            {member.nickname}
          </button>
        );
      })}
    </div>
  );
}
