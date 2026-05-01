'use client';

import { useState } from 'react';
import type { Member, EnvSnapshot } from '@/lib/types';
import BpCard from '@/components/bp-card';

/**
 * 베스트 프랙티스 메인 클라이언트 컴포넌트
 *
 * 5개 탭(CLAUDE.md / 스킬 / Hook / 에이전트 / MCP 커넥터)으로 구성.
 * 각 탭은 전체 멤버의 해당 카테고리 설정을 카드로 표시.
 * 하네스 85점 이상이면 "추천" 뱃지가 자동으로 붙음.
 */

// 탭 카테고리 정의
type TabKey = 'claude-md' | 'skill' | 'hook' | 'agent' | 'mcp';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'claude-md', label: 'CLAUDE.md' },
  { key: 'skill', label: '스킬' },
  { key: 'hook', label: 'Hook' },
  { key: 'agent', label: '에이전트' },
  { key: 'mcp', label: 'MCP 커넥터' },
];

interface BpClientProps {
  members: Member[];
  snapshots: EnvSnapshot[];
}

/**
 * 스냅샷 날짜를 "오늘", "어제", "N일 전" 형태의 상대 날짜로 변환
 */
function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const target = new Date(dateStr + 'T00:00:00');
  const diffMs = now.getTime() - target.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 30) return `${diffDays}일 전`;
  return dateStr;
}

export default function BpClient({ members, snapshots }: BpClientProps) {
  // 현재 선택된 탭
  const [activeTab, setActiveTab] = useState<TabKey>('claude-md');

  // 멤버 ID → 멤버 정보 맵 (빠른 조회용)
  const memberMap = new Map(members.map((m) => [m.id, m]));

  // 멤버 ID → 최신 스냅샷 맵
  const snapshotMap = new Map<string, EnvSnapshot>();
  for (const snap of snapshots) {
    // snapshots는 이미 최신 1건만 전달됨 (서버에서 멤버별 limit 1)
    if (!snapshotMap.has(snap.member_id)) {
      snapshotMap.set(snap.member_id, snap);
    }
  }

  // ── 탭별 카드 데이터 생성 함수 ──────────────────

  /**
   * CLAUDE.md 탭: 각 멤버의 claude_md_content를 미리보기로 표시
   */
  function renderClaudeMdCards() {
    const cards: React.ReactNode[] = [];

    for (const [memberId, snap] of snapshotMap) {
      const member = memberMap.get(memberId);
      if (!member) continue;
      // claude_md_content가 비어있으면 스킵
      if (!snap.claude_md_content?.trim()) continue;

      const lineCount = snap.claude_md_content.split('\n').length;

      cards.push(
        <BpCard
          key={`md-${memberId}`}
          nickname={member.nickname}
          avatarColor={member.avatar_color}
          harnessScore={snap.harness_score}
          type="claude-md"
          title={`${member.nickname}의 CLAUDE.md`}
          preview={snap.claude_md_content}
          meta={`📏 ${lineCount}줄`}
          updatedDate={formatRelativeDate(snap.date)}
          isRecommended={snap.harness_score >= 85}
        />
      );
    }

    return cards;
  }

  // ── 헬퍼: 멤버 아바타 + 이름 행 ──────────────────
  function MemberRow({
    nickname,
    avatarColor,
    children,
  }: {
    nickname: string;
    avatarColor: string;
    children: React.ReactNode;
  }) {
    return (
      <div className="flex items-start gap-3 mb-4">
        {/* 아바타 원형 */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: avatarColor }}
        >
          {nickname.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 mb-1.5">{nickname}</p>
          <div className="flex flex-wrap gap-1.5">{children}</div>
        </div>
      </div>
    );
  }

  /**
   * 스킬 탭: 팀 공통 스킬(골드 칩) + 멤버별 스킬 리스트
   */
  function renderSkillList() {
    // 스킬 이름 → 사용 멤버 수 집계
    const skillCount = new Map<string, number>();
    for (const [, snap] of snapshotMap) {
      if (!snap.skills_json?.length) continue;
      for (const skill of snap.skills_json) {
        skillCount.set(skill.name, (skillCount.get(skill.name) || 0) + 1);
      }
    }

    // 2명 이상이 설치한 스킬 = 팀 공통
    const teamSkills = [...skillCount.entries()]
      .filter(([, count]) => count >= 2)
      .map(([name]) => name)
      .sort();

    // 1명만 사용하는 스킬 세트
    const uniqueSkills = new Set(
      [...skillCount.entries()].filter(([, count]) => count === 1).map(([name]) => name)
    );

    const hasData = skillCount.size > 0;

    return (
      <div className="space-y-6">
        {/* 팀 공통 스킬 섹션 */}
        {teamSkills.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-3">팀 공통 스킬</p>
            <div className="flex flex-wrap gap-1.5">
              {teamSkills.map((name) => (
                <span
                  key={`team-${name}`}
                  className="px-3 py-1.5 rounded-lg text-sm bg-amber-50 border border-amber-200 text-amber-800"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 멤버별 스킬 */}
        {hasData && (
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-3">멤버별 스킬</p>
            {[...snapshotMap].map(([memberId, snap]) => {
              const member = memberMap.get(memberId);
              if (!member || !snap.skills_json?.length) return null;
              return (
                <MemberRow
                  key={`skill-row-${memberId}`}
                  nickname={member.nickname}
                  avatarColor={member.avatar_color}
                >
                  {snap.skills_json.map((skill) => (
                    <span
                      key={skill.name}
                      className={`px-3 py-1.5 rounded-lg text-sm border ${
                        uniqueSkills.has(skill.name)
                          ? 'bg-gray-100 border-gray-200 text-gray-700'
                          : 'bg-gray-100 border-gray-200 text-gray-700'
                      }`}
                    >
                      {skill.name}
                      {uniqueSkills.has(skill.name) && (
                        <span className="ml-1 text-xs text-gray-400">only</span>
                      )}
                    </span>
                  ))}
                </MemberRow>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /**
   * Hook 탭: 멤버별 Hook 리스트 (event: matcher 형태 칩)
   */
  function renderHookList() {
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-gray-500 mb-3">멤버별 Hook</p>
        {[...snapshotMap].map(([memberId, snap]) => {
          const member = memberMap.get(memberId);
          if (!member || !snap.hooks_json?.length) return null;
          return (
            <MemberRow
              key={`hook-row-${memberId}`}
              nickname={member.nickname}
              avatarColor={member.avatar_color}
            >
              {snap.hooks_json.map((hook, i) => (
                <span
                  key={`${hook.event}-${i}`}
                  className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 border border-gray-200 text-gray-700"
                >
                  {hook.event}
                  {hook.matcher && `: ${hook.matcher}`}
                </span>
              ))}
            </MemberRow>
          );
        })}
      </div>
    );
  }

  /**
   * 에이전트 탭: 멤버별 에이전트 칩 (이름 + 모델)
   */
  function renderAgentList() {
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-gray-500 mb-3">멤버별 에이전트</p>
        {[...snapshotMap].map(([memberId, snap]) => {
          const member = memberMap.get(memberId);
          if (!member || !snap.agents_json?.length) return null;
          return (
            <MemberRow
              key={`agent-row-${memberId}`}
              nickname={member.nickname}
              avatarColor={member.avatar_color}
            >
              {snap.agents_json.map((agent) => (
                <span
                  key={agent.name}
                  className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 border border-gray-200 text-gray-700"
                >
                  {agent.name}{' '}
                  <span className="text-gray-400">({agent.model})</span>
                </span>
              ))}
            </MemberRow>
          );
        })}
      </div>
    );
  }

  /**
   * MCP 커넥터 탭: 멤버별 커넥터 칩 (이름 + 타입)
   */
  function renderMcpList() {
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-gray-500 mb-3">멤버별 MCP 커넥터</p>
        {[...snapshotMap].map(([memberId, snap]) => {
          const member = memberMap.get(memberId);
          if (!member || !snap.mcp_json?.length) return null;
          return (
            <MemberRow
              key={`mcp-row-${memberId}`}
              nickname={member.nickname}
              avatarColor={member.avatar_color}
            >
              {snap.mcp_json.map((connector) => (
                <span
                  key={connector.name}
                  className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 border border-gray-200 text-gray-700"
                >
                  {connector.name}{' '}
                  <span className="text-gray-400">({connector.type})</span>
                </span>
              ))}
            </MemberRow>
          );
        })}
      </div>
    );
  }

  // ── 현재 탭에 해당하는 콘텐츠 렌더링 ──────────────

  function renderTabContent() {
    switch (activeTab) {
      case 'claude-md': {
        const cards = renderClaudeMdCards();
        if (cards.length === 0) {
          return (
            <div className="text-center py-20 text-gray-400">
              아직 환경 데이터가 수집되지 않았습니다.
            </div>
          );
        }
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards}
          </div>
        );
      }
      case 'skill':
        return renderSkillList();
      case 'hook':
        return renderHookList();
      case 'agent':
        return renderAgentList();
      case 'mcp':
        return renderMcpList();
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 서브 탭 바 (기간 필터와 유사한 스타일) ── */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 탭 콘텐츠 ── */}
      {renderTabContent()}
    </div>
  );
}
