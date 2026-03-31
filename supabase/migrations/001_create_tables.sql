-- 팀원 정보
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL UNIQUE,
  avatar_color TEXT NOT NULL DEFAULT '#D4A020',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 일별 사용량
CREATE TABLE daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  session_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id, date)
);

-- 팀원은 첫 데이터 제출 시 자동 생성됨 (API에서 처리)

-- 인덱스
CREATE INDEX idx_daily_usage_date ON daily_usage(date DESC);
CREATE INDEX idx_daily_usage_member_date ON daily_usage(member_id, date DESC);
