-- 환경 스냅샷 (매일 1회)
CREATE TABLE env_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  harness_score INT NOT NULL DEFAULT 0,
  claude_md_lines INT NOT NULL DEFAULT 0,
  claude_md_content TEXT DEFAULT '',
  skill_count INT NOT NULL DEFAULT 0,
  agent_count INT NOT NULL DEFAULT 0,
  hook_count INT NOT NULL DEFAULT 0,
  mcp_count INT NOT NULL DEFAULT 0,
  plugin_count INT NOT NULL DEFAULT 0,
  permission_allow_count INT NOT NULL DEFAULT 0,
  skills_json JSONB DEFAULT '[]',
  agents_json JSONB DEFAULT '[]',
  hooks_json JSONB DEFAULT '[]',
  mcp_json JSONB DEFAULT '[]',
  plugins_json JSONB DEFAULT '[]',
  settings_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id, date)
);

CREATE INDEX idx_env_snapshots_member_date ON env_snapshots(member_id, date DESC);
CREATE INDEX idx_env_snapshots_date ON env_snapshots(date DESC);

-- GitHub 레포 상태
CREATE TABLE github_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_name TEXT NOT NULL UNIQUE,
  visibility TEXT NOT NULL DEFAULT 'private',
  description TEXT DEFAULT '',
  last_commit_at TIMESTAMPTZ,
  open_pr_count INT DEFAULT 0,
  open_issue_count INT DEFAULT 0,
  status TEXT DEFAULT 'active',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- GitHub 일별 활동
CREATE TABLE github_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  repo_name TEXT NOT NULL,
  member_nickname TEXT,
  commit_count INT NOT NULL DEFAULT 0,
  pr_count INT NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, repo_name, member_nickname)
);

CREATE INDEX idx_github_activity_date ON github_activity(date DESC);
