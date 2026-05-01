import { createServerSupabase } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * /env 인덱스 페이지
 * 첫 번째 멤버의 환경 점검 페이지로 자동 리다이렉트
 * 멤버가 없으면 안내 메시지 표시
 */
export default async function EnvIndexPage() {
  const supabase = createServerSupabase();
  const { data: members } = await supabase
    .from('members')
    .select('nickname')
    .order('created_at')
    .limit(1);

  if (members && members.length > 0) {
    redirect(`/env/${encodeURIComponent(members[0].nickname)}`);
  }

  return (
    <div className="text-center py-20 text-gray-500">
      아직 등록된 멤버가 없습니다. 설치 가이드를 확인하세요.
    </div>
  );
}
