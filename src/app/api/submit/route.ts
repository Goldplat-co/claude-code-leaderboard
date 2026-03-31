import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import type { SubmitRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  const body: SubmitRequest = await request.json();

  if (body.api_key !== process.env.SUBMIT_API_KEY) {
    return NextResponse.json({ success: false, message: '인증 실패' }, { status: 401 });
  }

  if (!body.nickname || !body.date || body.total_tokens == null) {
    return NextResponse.json({ success: false, message: '필수 필드 누락' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // 닉네임으로 member 조회, 없으면 자동 생성
  let { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('nickname', body.nickname)
    .single();

  if (!member) {
    // 랜덤 색상 배정 (골드, 블루, 그린, 퍼플, 오렌지 중)
    const colors = ['#D4A020', '#3B82F6', '#10B981', '#8B5CF6', '#F97316'];
    const { count } = await supabase.from('members').select('*', { count: 'exact', head: true });
    const color = colors[(count ?? 0) % colors.length];

    const { data: newMember, error: insertError } = await supabase
      .from('members')
      .insert({ nickname: body.nickname, avatar_color: color })
      .select('id')
      .single();

    if (insertError || !newMember) {
      return NextResponse.json({ success: false, message: `팀원 등록 실패: ${insertError?.message}` }, { status: 500 });
    }
    member = newMember;
  }

  const { error: upsertError } = await supabase
    .from('daily_usage')
    .upsert({
      member_id: member.id,
      date: body.date,
      input_tokens: body.input_tokens,
      output_tokens: body.output_tokens,
      total_tokens: body.total_tokens,
      cost_usd: body.cost_usd,
      session_count: body.session_count,
    }, { onConflict: 'member_id,date' });

  if (upsertError) {
    return NextResponse.json({ success: false, message: `저장 실패: ${upsertError.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: `${body.nickname}님의 ${body.date} 데이터가 등록되었습니다` });
}
