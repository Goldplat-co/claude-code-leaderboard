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

  /**
   * 스킬 탭: 각 멤버의 skills_json에서 개별 스킬마다 카드 생성
   */
  function renderSkillCards() {
    const cards: React.ReactNode[] = [];

    for (const [memberId, snap] of snapshotMap) {
      const member = memberMap.get(memberId);
      if (!member) continue;
      if (!snap.skills_json?.length) continue;

      for (const skill of snap.skills_json) {
        cards.push(
          <BpCard
            key={`skill-${memberId}-${skill.name}`}
            nickname={member.nickname}
            avatarColor={member.avatar_color}
            harnessScore={snap.harness_score}
            type="skill"
            title={`${member.nickname}의 ${skill.name}`}
            preview={skill.description || skill.name}
            meta="⚡ 범용 스킬"
            updatedDate={formatRelativeDate(snap.date)}
            isRecommended={snap.harness_score >= 85}
          />
        );
      }
    }

    return cards;
  }

  /**
   * Hook 탭: 각 멤버의 hooks_json을 JSON 형태로 미리보기
   */
  function renderHookCards() {
    const cards: React.ReactNode[] = [];

    for (const [memberId, snap] of snapshotMap) {
      const member = memberMap.get(memberId);
      if (!member) continue;
      if (!snap.hooks_json?.length) continue;

      const preview = JSON.stringify(snap.hooks_json, null, 2);

      cards.push(
        <BpCard
          key={`hook-${memberId}`}
          nickname={member.nickname}
          avatarColor={member.avatar_color}
          harnessScore={snap.harness_score}
          type="hook"
          title={`${member.nickname}의 Hooks (${snap.hooks_json.length}개)`}
          preview={preview}
          meta={`🔗 ${snap.hooks_json.length}개 Hook`}
          updatedDate={formatRelativeDate(snap.date)}
          isRecommended={snap.harness_score >= 85}
        />
      );
    }

    return cards;
  }

  /**
   * 에이전트 탭: 각 멤버의 agents_json에서 개별 에이전트마다 카드 생성
   */
  function renderAgentCards() {
    const cards: React.ReactNode[] = [];

    for (const [memberId, snap] of snapshotMap) {
      const member = memberMap.get(memberId);
      if (!member) continue;
      if (!snap.agents_json?.length) continue;

      for (const agent of snap.agents_json) {
        const preview = [
          `이름: ${agent.name}`,
          `모델: ${agent.model}`,
          '',
          agent.description || '(설명 없음)',
        ].join('\n');

        cards.push(
          <BpCard
            key={`agent-${memberId}-${agent.name}`}
            nickname={member.nickname}
            avatarColor={member.avatar_color}
            harnessScore={snap.harness_score}
            type="agent"
            title={`${member.nickname}의 ${agent.name}`}
            preview={preview}
            meta={`🤖 ${agent.model}`}
            updatedDate={formatRelativeDate(snap.date)}
            isRecommended={snap.harness_score >= 85}
          />
        );
      }
    }

    return cards;
  }

  /**
   * MCP 탭: 각 멤버의 mcp_json을 리스트 형태로 미리보기
   */
  function renderMcpCards() {
    const cards: React.ReactNode[] = [];

    for (const [memberId, snap] of snapshotMap) {
      const member = memberMap.get(memberId);
      if (!member) continue;
      if (!snap.mcp_json?.length) continue;

      const preview = snap.mcp_json
        .map((m) => `• ${m.name} (${m.type})`)
        .join('\n');

      cards.push(
        <BpCard
          key={`mcp-${memberId}`}
          nickname={member.nickname}
          avatarColor={member.avatar_color}
          harnessScore={snap.harness_score}
          type="mcp"
          title={`${member.nickname}의 MCP (${snap.mcp_json.length}개)`}
          preview={preview}
          meta={`🔌 ${snap.mcp_json.length}개 커넥터`}
          updatedDate={formatRelativeDate(snap.date)}
          isRecommended={snap.harness_score >= 85}
        />
      );
    }

    return cards;
  }

  // ── 현재 탭에 해당하는 카드 렌더링 ──────────────

  const cardRenderers: Record<TabKey, () => React.ReactNode[]> = {
    'claude-md': renderClaudeMdCards,
    skill: renderSkillCards,
    hook: renderHookCards,
    agent: renderAgentCards,
    mcp: renderMcpCards,
  };

  const cards = cardRenderers[activeTab]();

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

      {/* ── 카드 그리드 또는 빈 상태 ── */}
      {cards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          아직 환경 데이터가 수집되지 않았습니다.
        </div>
      )}
    </div>
  );
}
