'use client';

import { useState } from 'react';
import type { Member, EnvSnapshot } from '@/lib/types';

/**
 * Best Practices 메인 클라이언트 컴포넌트
 *
 * 5개 탭(CLAUDE.md / Skill / Hook / Agent / Connected Tools)으로 구성.
 * CLAUDE.md 탭은 멤버별 분석 카드 + 비교 테이블을 표시.
 * 나머지 탭은 기존 칩/리스트 디자인 유지.
 */

// ── CLAUDE.md 분석 헬퍼 ──────────────────────

interface ClaudeAnalysis {
  sections: string[];   // ## 헤딩 목록
  strengths: string[];  // 잘 설정된 항목
  missing: string[];    // 추가 권장 항목
}

/**
 * CLAUDE.md 내용을 간단한 휴리스틱으로 분석하여
 * 어떤 설정이 되어 있고, 무엇이 빠져 있는지 판단
 */
function analyzeClaudeMd(content: string): ClaudeAnalysis {
  // ## 헤딩 추출
  const lines = content.split('\n');
  const sections = lines
    .filter((l) => l.startsWith('## '))
    .map((l) => l.replace(/^##\s+/, ''));

  // 키워드 패턴별 체크
  const checks = [
    { pattern: /규칙|rule|원칙/i, label: '규칙 정의' },
    { pattern: /말투|소통|tone|커뮤니케이션/i, label: '소통 스타일' },
    { pattern: /git|커밋|commit/i, label: 'Git 규칙' },
    { pattern: /기술|환경|stack|프레임워크/i, label: '기술 환경' },
    { pattern: /하지\s*말|DON'?T|금지|절대/i, label: '행동 규칙 (DO/DON\'T)' },
    { pattern: /api|보안|키|secret|token/i, label: '보안 규칙' },
  ];

  const strengths: string[] = [];
  const missing: string[] = [];
  for (const check of checks) {
    if (check.pattern.test(content)) {
      strengths.push(check.label);
    } else {
      missing.push(check.label);
    }
  }

  return { sections, strengths, missing };
}

// ── 탭 카테고리 정의 ──────────────────────

type TabKey = 'claude-md' | 'skill' | 'hook' | 'agent' | 'mcp';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'claude-md', label: 'CLAUDE.md' },
  { key: 'skill', label: 'Skill' },
  { key: 'hook', label: 'Hook' },
  { key: 'agent', label: 'Agent' },
  { key: 'mcp', label: 'Connected Tools' },
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

// ── 하네스 점수 뱃지 컴포넌트 ──────────────────────

function HarnessBadge({ score }: { score: number }) {
  // 점수 구간별 색상
  let bg = 'bg-gray-100';
  let text = 'text-gray-500';
  if (score >= 85) {
    bg = 'bg-amber-50';
    text = 'text-amber-700';
  } else if (score >= 60) {
    bg = 'bg-blue-50';
    text = 'text-blue-600';
  } else if (score >= 30) {
    bg = 'bg-orange-50';
    text = 'text-orange-600';
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${bg} ${text}`}>
      {score >= 85 && '★ '}{score}점
    </span>
  );
}

export default function BpClient({ members, snapshots }: BpClientProps) {
  // 현재 선택된 탭
  const [activeTab, setActiveTab] = useState<TabKey>('claude-md');

  // 펼침/접힘 상태를 멤버 ID별로 관리
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  // 멤버 ID → 멤버 정보 맵
  const memberMap = new Map(members.map((m) => [m.id, m]));

  // 멤버 ID → 최신 스냅샷 맵
  const snapshotMap = new Map<string, EnvSnapshot>();
  for (const snap of snapshots) {
    if (!snapshotMap.has(snap.member_id)) {
      snapshotMap.set(snap.member_id, snap);
    }
  }

  // ── 펼침/접힘 토글 ──────────────────
  function toggleExpand(memberId: string) {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }

  // ── CLAUDE.md 비교 테이블 + 분석 카드 ──────────────────

  function renderClaudeMdTab() {
    // 멤버별 분석 데이터 수집
    const analysisData: {
      memberId: string;
      member: Member;
      snap: EnvSnapshot;
      analysis: ClaudeAnalysis;
      lineCount: number;
    }[] = [];

    for (const [memberId, snap] of snapshotMap) {
      const member = memberMap.get(memberId);
      if (!member) continue;
      const content = snap.claude_md_content?.trim() || '';
      const lineCount = content ? content.split('\n').length : 0;
      const analysis = analyzeClaudeMd(content);
      analysisData.push({ memberId, member, snap, analysis, lineCount });
    }

    // 데이터가 없는 멤버도 테이블에 포함
    for (const member of members) {
      if (!analysisData.find((d) => d.memberId === member.id)) {
        analysisData.push({
          memberId: member.id,
          member,
          snap: null as unknown as EnvSnapshot,
          analysis: { sections: [], strengths: [], missing: [] },
          lineCount: 0,
        });
      }
    }

    // 비교 체크 항목 라벨
    const checkLabels = [
      '규칙 정의',
      '소통 스타일',
      'Git 규칙',
      '기술 환경',
      '행동 규칙 (DO/DON\'T)',
      '보안 규칙',
    ];

    return (
      <div className="space-y-8">
        {/* ── 비교 테이블 ── */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">CLAUDE.md 비교</h3>
            <p className="text-xs text-gray-400 mt-0.5">팀원별 CLAUDE.md 설정 현황을 한눈에 비교</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 w-40">항목</th>
                  {analysisData.map((d) => (
                    <th key={d.memberId} className="text-center px-4 py-3">
                      <div className="flex flex-col items-center gap-1">
                        {/* 아바타 */}
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                          style={{ backgroundColor: d.member.avatar_color }}
                        >
                          {d.member.nickname.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{d.member.nickname}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* 줄 수 */}
                <tr className="border-b border-gray-50">
                  <td className="px-5 py-2.5 text-xs font-medium text-gray-600">줄 수</td>
                  {analysisData.map((d) => (
                    <td key={d.memberId} className="text-center px-4 py-2.5 text-xs font-mono text-gray-700">
                      {d.lineCount > 0 ? d.lineCount : <span className="text-gray-300">0</span>}
                    </td>
                  ))}
                </tr>

                {/* 각 체크 항목 */}
                {checkLabels.map((label) => (
                  <tr key={label} className="border-b border-gray-50">
                    <td className="px-5 py-2.5 text-xs font-medium text-gray-600">{label}</td>
                    {analysisData.map((d) => (
                      <td key={d.memberId} className="text-center px-4 py-2.5 text-sm">
                        {d.analysis.strengths.includes(label) ? (
                          <span className="text-emerald-500 font-medium">&#10003;</span>
                        ) : (
                          <span className="text-gray-300">&mdash;</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 멤버별 분석 카드 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {analysisData.map((d) => {
            const hasContent = d.lineCount > 0;
            const isExpanded = expandedMembers.has(d.memberId);

            return (
              <div
                key={`card-${d.memberId}`}
                className="bg-white border border-gray-200 rounded-xl shadow-sm transition-all duration-200 hover:border-[#D4A020] hover:shadow-[0_2px_12px_rgba(212,160,32,0.15)] overflow-hidden"
              >
                {/* ── 카드 헤더: 아바타 + 이름 + 줄 수 + 하네스 뱃지 ── */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <div className="flex items-center gap-3">
                    {/* 아바타 */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: d.member.avatar_color }}
                    >
                      {d.member.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{d.member.nickname}</p>
                      <p className="text-xs text-gray-400">
                        {hasContent ? `${d.lineCount}줄` : 'CLAUDE.md 없음'}
                      </p>
                    </div>
                  </div>

                  {/* 하네스 점수 뱃지 */}
                  {d.snap && <HarnessBadge score={d.snap.harness_score} />}
                </div>

                {/* ── 분석 섹션 ── */}
                {hasContent ? (
                  <div className="px-5 pb-4 space-y-4">
                    {/* 발견된 섹션 */}
                    {d.analysis.sections.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">주요 섹션</p>
                        <div className="flex flex-wrap gap-1.5">
                          {d.analysis.sections.map((s) => (
                            <span
                              key={s}
                              className="px-2.5 py-1 rounded-md text-xs bg-gray-100 border border-gray-200 text-gray-600"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 잘 설정된 항목 (Strengths) */}
                    {d.analysis.strengths.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-emerald-600 mb-1.5">설정됨</p>
                        <div className="flex flex-wrap gap-1.5">
                          {d.analysis.strengths.map((s) => (
                            <span
                              key={s}
                              className="px-2.5 py-1 rounded-md text-xs bg-emerald-50 border border-emerald-200 text-emerald-700"
                            >
                              &#10003; {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 추가 권장 항목 (Missing) */}
                    {d.analysis.missing.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1.5">추가 권장</p>
                        <div className="flex flex-wrap gap-1.5">
                          {d.analysis.missing.map((s) => (
                            <span
                              key={s}
                              className="px-2.5 py-1 rounded-md text-xs bg-gray-50 border border-gray-200 text-gray-400"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 전문 보기 버튼 */}
                    <button
                      onClick={() => toggleExpand(d.memberId)}
                      className="w-full mt-1 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                    >
                      {isExpanded ? '접기 ▲' : '전문 보기 ▼'}
                    </button>

                    {/* 펼쳐진 전문 보기 (다크 코드 블록) */}
                    {isExpanded && (
                      <div className="rounded-lg overflow-hidden">
                        <pre
                          className="bg-[#1e1e1e] text-[#d4d4d4] text-xs font-mono px-4 py-3 whitespace-pre-wrap break-words leading-relaxed overflow-y-auto"
                          style={{ maxHeight: '400px' }}
                        >
                          {d.snap.claude_md_content}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  /* CLAUDE.md 없는 멤버 */
                  <div className="px-5 pb-5">
                    <div className="py-6 text-center text-gray-300 text-xs bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      CLAUDE.md가 아직 설정되지 않았습니다
                    </div>
                  </div>
                )}

                {/* ── 카드 푸터: 줄 수 + 마지막 업데이트 ── */}
                {d.snap && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
                    <span>{d.lineCount}줄</span>
                    <span>{formatRelativeDate(d.snap.date)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
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
   * Skill 탭: 팀 공통 스킬(골드 칩) + 멤버별 스킬 리스트
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
   * Hook 탭: 멤버별 Hook 리스트
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
   * Agent 탭: 멤버별 에이전트 칩 (이름 + 모델)
   */
  function renderAgentList() {
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-gray-500 mb-3">멤버별 Agent</p>
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
   * Connected Tools 탭: 멤버별 MCP + 플러그인 통합 표시
   */
  function renderConnectedToolsList() {
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-gray-500 mb-3">멤버별 Connected Tools (MCP + Plugins)</p>
        {[...snapshotMap].map(([memberId, snap]) => {
          const member = memberMap.get(memberId);
          if (!member) return null;
          const hasMcp = snap.mcp_json?.length > 0;
          const hasPlugins = snap.plugins_json?.length > 0;
          if (!hasMcp && !hasPlugins) return null;
          return (
            <MemberRow
              key={`tools-row-${memberId}`}
              nickname={member.nickname}
              avatarColor={member.avatar_color}
            >
              {(snap.plugins_json || []).map((plugin) => (
                <span
                  key={`plugin-${plugin.name}`}
                  className="px-3 py-1.5 rounded-lg text-sm bg-violet-50 border border-violet-200 text-violet-700"
                >
                  {plugin.name}
                </span>
              ))}
              {(snap.mcp_json || []).map((connector) => (
                <span
                  key={`mcp-${connector.name}`}
                  className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 border border-gray-200 text-gray-700"
                >
                  {connector.name}
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
      case 'claude-md':
        return renderClaudeMdTab();
      case 'skill':
        return renderSkillList();
      case 'hook':
        return renderHookList();
      case 'agent':
        return renderAgentList();
      case 'mcp':
        return renderConnectedToolsList();
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 서브 탭 바 ── */}
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
