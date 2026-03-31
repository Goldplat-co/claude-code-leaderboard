import { createServerSupabase } from '@/lib/supabase';
import type { Member, DailyUsage } from '@/lib/types';
import TrendsClient from './trends-client';

export const dynamic = 'force-dynamic';

/**
 * 트렌드 페이지 — 서버 컴포넌트
 * Supabase에서 members + daily_usage를 가져와 클라이언트 컴포넌트로 전달
 */
export default async function TrendsPage() {
  const supabase = createServerSupabase();

  // 멤버 목록과 일별 사용량을 병렬로 조회
  const [membersRes, usageRes] = await Promise.all([
    supabase.from('members').select('*').order('created_at', { ascending: true }),
    supabase.from('daily_usage').select('*').order('date', { ascending: true }),
  ]);

  const members: Member[] = membersRes.data ?? [];
  const usage: DailyUsage[] = usageRes.data ?? [];

  return <TrendsClient members={members} usage={usage} />;
}
