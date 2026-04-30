import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { calculateHarness } from '@/lib/harness';
import type { SnapshotRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  const body: SnapshotRequest = await request.json();

  // 인증 확인 — SNAPSHOT_API_KEY 환경변수와 비교
  if (body.api_key !== process.env.SNAPSHOT_API_KEY) {
    return NextResponse.json({ success: false, message: '인증 실패' }, { status: 401 });
  }

  // 필수 필드 검증 (닉네임, 날짜)
  if (!body.nickname || !body.date) {
    return NextResponse.json({ success: false, message: '필수 필드 누락 (nickname, date)' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // 기존 멤버 조회 — 리더보드 collect.sh로 먼저 등록되어 있어야 함
  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('nickname', body.nickname)
    .single();

  if (!member) {
    return NextResponse.json(
      { success: false, message: `멤버 "${body.nickname}"을 찾을 수 없습니다. 리더보드 수집기를 먼저 실행하세요.` },
      { status: 404 }
    );
  }

  // 하네스 점수 계산 — 환경 설정 완성도를 0~100으로 채점
  const { score } = calculateHarness({
    claude_md_content: body.claude_md_content || '',
    skills: body.skills || [],
    agents: body.agents || [],
    hooks: body.hooks || [],
    mcp_connectors: body.mcp_connectors || [],
    plugins: body.plugins || [],
    settings: body.settings || {},
  });

  // CLAUDE.md 비어있지 않은 줄 수 집계
  const mdLines = (body.claude_md_content || '').split('\n').filter((l: string) => l.trim()).length;

  // 권한 allow 목록 추출
  const perms = (body.settings?.permissions as { allow?: string[] })?.allow ?? [];

  // env_snapshots 테이블에 upsert (같은 날짜 재제출 시 덮어쓰기)
  const { error } = await supabase
    .from('env_snapshots')
    .upsert({
      member_id: member.id,
      date: body.date,
      harness_score: score,
      claude_md_lines: mdLines,
      claude_md_content: (body.claude_md_content || '').slice(0, 10000), // 10KB 안전 제한
      skill_count: (body.skills || []).length,
      agent_count: (body.agents || []).length,
      hook_count: (body.hooks || []).length,
      mcp_count: (body.mcp_connectors || []).length,
      plugin_count: (body.plugins || []).length,
      permission_allow_count: perms.length,
      skills_json: body.skills || [],
      agents_json: body.agents || [],
      hooks_json: body.hooks || [],
      mcp_json: body.mcp_connectors || [],
      plugins_json: body.plugins || [],
      settings_json: body.settings || {},
    }, { onConflict: 'member_id,date' });

  if (error) {
    return NextResponse.json({ success: false, message: `저장 실패: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `${body.nickname}님의 ${body.date} 환경 스냅샷 저장 완료 (하네스 ${score}점)`,
    harness_score: score,
  });
}
