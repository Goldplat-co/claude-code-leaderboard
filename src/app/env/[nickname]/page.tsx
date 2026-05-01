import { createServerSupabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import EnvClient from './env-client';
import type { Member, EnvSnapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ nickname: string }>;
}

/**
 * /env/[nickname] 서버 컴포넌트
 * Supabase에서 멤버 정보 + 환경 스냅샷 히스토리를 조회하여
 * 클라이언트 컴포넌트(EnvClient)에 전달
 */
export default async function EnvPage({ params }: Props) {
  const { nickname } = await params;
  const decoded = decodeURIComponent(nickname);
  const supabase = createServerSupabase();

  // 닉네임으로 멤버 조회
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('nickname', decoded)
    .single();

  if (!member) notFound();

  // 전체 멤버 목록 (드롭다운 선택용)
  const { data: allMembers } = await supabase
    .from('members')
    .select('*')
    .order('created_at');

  // 해당 멤버의 환경 스냅샷 히스토리 (최근 30일, 최신 순)
  const { data: snapshots } = await supabase
    .from('env_snapshots')
    .select('*')
    .eq('member_id', member.id)
    .order('date', { ascending: false })
    .limit(30);

  return (
    <EnvClient
      snapshot={(snapshots?.[0] as EnvSnapshot) ?? null}
      history={(snapshots as EnvSnapshot[]) ?? []}
      member={member as Member}
      allMembers={(allMembers as Member[]) ?? []}
    />
  );
}
