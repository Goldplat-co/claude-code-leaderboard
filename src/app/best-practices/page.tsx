import { createServerSupabase } from '@/lib/supabase';
import BpClient from './bp-client';
import type { EnvSnapshot } from '@/lib/types';

// 빌드 시 Supabase 호출 방지 (항상 최신 데이터 조회)
export const dynamic = 'force-dynamic';

/**
 * 베스트 프랙티스 페이지 (서버 컴포넌트)
 *
 * 팀원들의 Claude Code 설정(CLAUDE.md, 스킬, Hook, 에이전트, MCP)을
 * 서로 공유하고 배울 수 있는 페이지.
 *
 * 1. Supabase에서 전체 멤버 조회
 * 2. 각 멤버의 최신 스냅샷 1건씩 조회
 * 3. BpClient에 데이터 전달
 */
export default async function BestPracticesPage() {
  const supabase = createServerSupabase();

  // 멤버 목록 조회
  const { data: members } = await supabase
    .from('members')
    .select('*')
    .order('created_at');

  // 각 멤버의 최신 스냅샷 1건씩 조회
  const latestSnapshots: EnvSnapshot[] = [];
  for (const m of members ?? []) {
    const { data } = await supabase
      .from('env_snapshots')
      .select('*')
      .eq('member_id', m.id)
      .order('date', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      latestSnapshots.push(data[0] as EnvSnapshot);
    }
  }

  return (
    <div>
      {/* 페이지 제목 */}
      <h1 className="text-2xl font-bold mb-6">베스트 프랙티스</h1>

      {/* 클라이언트 컴포넌트 */}
      <BpClient members={members ?? []} snapshots={latestSnapshots} />
    </div>
  );
}
