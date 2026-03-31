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
