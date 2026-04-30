export interface Member {
  id: string;
  nickname: string;
  avatar_color: string;
  created_at: string;
}

export interface DailyUsage {
  id: string;
  member_id: string;
  date: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  session_count: number;
  created_at: string;
}

// 리더보드 순위용 (집계 결과)
export interface RankedMember {
  member_id: string;
  nickname: string;
  avatar_color: string;
  total_tokens: number;
  cost_usd: number;
  session_count: number;
  rank: number;
  prev_rank: number | null;
}

// 트렌드 차트용
export interface TrendPoint {
  date: string;
  [nickname: string]: string | number;
}

// API 제출 요청
export interface SubmitRequest {
  nickname: string;
  api_key: string;
  date: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  session_count: number;
}

// 날짜 범위 (ISO 문자열, 예: "2026-03-25")
export interface DateRange {
  start: string;
  end: string;
}

// 기간 필터
export type PeriodFilter = '7d' | '14d' | '30d' | 'all' | 'custom';

// 지표 탭
export type MetricTab = 'tokens' | 'cost' | 'sessions';

// ── Dashboard 타입 ──────────────────────────

export interface EnvSnapshot {
  id: string;
  member_id: string;
  date: string;
  harness_score: number;
  claude_md_lines: number;
  claude_md_content: string;
  skill_count: number;
  agent_count: number;
  hook_count: number;
  mcp_count: number;
  plugin_count: number;
  permission_allow_count: number;
  skills_json: SkillEntry[];
  agents_json: AgentEntry[];
  hooks_json: HookEntry[];
  mcp_json: McpEntry[];
  plugins_json: PluginEntry[];
  settings_json: Record<string, unknown>;
  created_at: string;
}

export interface SkillEntry {
  name: string;
  description: string;
}

export interface AgentEntry {
  name: string;
  description: string;
  model: string;
}

export interface HookEntry {
  event: string;
  type: string;
  matcher?: string;
}

export interface McpEntry {
  name: string;
  type: string;
}

export interface PluginEntry {
  name: string;
  version: string;
  enabled: boolean;
}

export interface SnapshotRequest {
  nickname: string;
  api_key: string;
  date: string;
  claude_md_content: string;
  skills: SkillEntry[];
  agents: AgentEntry[];
  hooks: HookEntry[];
  mcp_connectors: McpEntry[];
  plugins: PluginEntry[];
  settings: Record<string, unknown>;
}

export interface TeamOverview {
  active_members: number;
  total_members: number;
  avg_harness: number;
  total_skills: number;
  unique_skills: number;
  today_sessions: number;
}

export interface TeamMemberRow {
  member_id: string;
  nickname: string;
  avatar_color: string;
  harness_score: number;
  skill_count: number;
  agent_count: number;
  hook_count: number;
  mcp_count: number;
  last_activity: string;
  badge: 'most-active' | 'best-setup' | 'growing' | 'starter';
}

export interface GitHubRepo {
  id: string;
  repo_name: string;
  visibility: string;
  description: string;
  last_commit_at: string | null;
  open_pr_count: number;
  open_issue_count: number;
  status: string;
  updated_at: string;
}

export interface GitHubActivity {
  id: string;
  date: string;
  repo_name: string;
  member_nickname: string;
  commit_count: number;
  pr_count: number;
  review_count: number;
}

export interface HarnessCheck {
  label: string;
  passed: boolean;
  detail: string;
  points: number;
  maxPoints: number;
}
