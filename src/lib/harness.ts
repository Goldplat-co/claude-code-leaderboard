import type { HarnessCheck } from './types';

interface HarnessInput {
  claude_md_content: string;
  skills: { name: string }[];
  agents: { name: string }[];
  hooks: { event: string }[];
  mcp_connectors: { name: string }[];
  plugins: { name: string }[];
  settings: Record<string, unknown>;
}

export function calculateHarness(data: HarnessInput): {
  score: number;
  checks: HarnessCheck[];
} {
  const checks: HarnessCheck[] = [];
  let score = 0;

  // CLAUDE.md 설정 여부 (20점)
  const mdLines = (data.claude_md_content || '').split('\n').filter(l => l.trim()).length;
  const mdOk = mdLines >= 10;
  checks.push({
    label: 'CLAUDE.md',
    passed: mdOk,
    detail: mdOk ? `${mdLines}줄 설정됨` : mdLines > 0 ? `${mdLines}줄 (10줄 이상 권장)` : '미설정',
    points: mdOk ? 20 : 0,
    maxPoints: 20,
  });
  if (mdOk) score += 20;

  // 권한 설정 (15점)
  const perms = (data.settings?.permissions as { allow?: string[] })?.allow ?? [];
  const permOk = perms.length >= 3;
  checks.push({
    label: '권한 설정',
    passed: permOk,
    detail: permOk ? `${perms.length}개 allow` : `${perms.length}개 (3개 이상 권장)`,
    points: permOk ? 15 : 0,
    maxPoints: 15,
  });
  if (permOk) score += 15;

  // Hook 설정 (15점)
  const hookOk = data.hooks.length >= 1;
  checks.push({
    label: 'Hook',
    passed: hookOk,
    detail: hookOk ? `${data.hooks.length}개 활성` : '미설정',
    points: hookOk ? 15 : 0,
    maxPoints: 15,
  });
  if (hookOk) score += 15;

  // 에이전트 설정 (15점)
  const agentOk = data.agents.length >= 1;
  checks.push({
    label: '에이전트',
    passed: agentOk,
    detail: agentOk ? `${data.agents.length}개 설정` : '미설정',
    points: agentOk ? 15 : 0,
    maxPoints: 15,
  });
  if (agentOk) score += 15;

  // 스킬 설정 (15점)
  const skillOk = data.skills.length >= 3;
  checks.push({
    label: '스킬',
    passed: skillOk,
    detail: skillOk ? `${data.skills.length}개 활성` : `${data.skills.length}개 (3개 이상 권장)`,
    points: skillOk ? 15 : 0,
    maxPoints: 15,
  });
  if (skillOk) score += 15;

  // 연결된 도구: MCP 커넥터 + 플러그인 합산 (20점)
  const totalTools = data.mcp_connectors.length + data.plugins.length;
  const toolsOk = totalTools >= 1;
  checks.push({
    label: '연결된 도구',
    passed: toolsOk,
    detail: toolsOk
      ? `${totalTools}개 연결 (MCP ${data.mcp_connectors.length} + 플러그인 ${data.plugins.length})`
      : '미설정',
    points: toolsOk ? 20 : 0,
    maxPoints: 20,
  });
  if (toolsOk) score += 20;

  return { score, checks };
}
