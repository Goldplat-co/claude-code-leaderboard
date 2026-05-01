import { createServerSupabase } from '@/lib/supabase';
import TeamClient from './team-client';
import type { Member, EnvSnapshot, DailyUsage } from '@/lib/types';

// 동적 렌더링 (빌드 시 Supabase 호출 방지)
export const dynamic = 'force-dynamic';

/**
 * 팀 모니터링 페이지 (서버 컴포넌트)
 *
 * Supabase에서 멤버, 환경 스냅샷, 일별 사용량을 병렬 조회 후
 * TeamClient 클라이언트 컴포넌트에 전달
 */
export default async function TeamPage() {
  const supabase = createServerSupabase();

  // 멤버 목록 + 환경 스냅샷(최신순) + 일별 사용량(최신순, 200건)을 병렬 조회
  const [membersRes, snapshotsRes, usageRes] = await Promise.all([
    supabase.from('members').select('*').order('created_at'),
    supabase
      .from('env_snapshots')
      .select('*')
      .order('date', { ascending: false }),
    supabase
      .from('daily_usage')
      .select('*')
      .order('date', { ascending: false })
      .limit(200),
  ]);

  const members: Member[] = membersRes.data ?? [];
  const snapshots: EnvSnapshot[] = snapshotsRes.data ?? [];
  const dailyUsage: DailyUsage[] = usageRes.data ?? [];

  return (
    <div>
      {/* 페이지 제목 */}
      <h1 className="text-2xl font-bold mb-6">팀 모니터링</h1>

      {/* 팀 모니터링 클라이언트 컴포넌트 */}
      <TeamClient
        members={members}
        snapshots={snapshots}
        dailyUsage={dailyUsage}
      />
    </div>
  );
}
