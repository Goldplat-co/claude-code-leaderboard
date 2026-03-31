import { createServerSupabase } from '@/lib/supabase';
import type { Member, DailyUsage } from '@/lib/types';
import ProfileClient from './profile-client';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ nickname: string }>;
}

export default async function ProfilePage({ params }: Props) {
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

  // 해당 멤버의 일별 사용량 데이터 조회 (날짜 오름차순)
  const { data: usage } = await supabase
    .from('daily_usage')
    .select('*')
    .eq('member_id', member.id)
    .order('date', { ascending: true });

  // 전체 멤버의 비용 데이터 조회 (순위 계산용)
  const { data: allUsage } = await supabase
    .from('daily_usage')
    .select('member_id, cost_usd');

  // 멤버별 총 비용 집계 → 순위 계산
  const costByMember = new Map<string, number>();
  (allUsage ?? []).forEach((u: any) => {
    costByMember.set(u.member_id, (costByMember.get(u.member_id) ?? 0) + Number(u.cost_usd));
  });
  const sorted = [...costByMember.entries()].sort((a, b) => b[1] - a[1]);
  const rank = sorted.findIndex(([id]) => id === member.id) + 1;
  const totalMembers = sorted.length;

  return (
    <ProfileClient
      member={member as Member}
      usage={(usage as DailyUsage[]) ?? []}
      rank={rank}
      totalMembers={totalMembers}
    />
  );
}
