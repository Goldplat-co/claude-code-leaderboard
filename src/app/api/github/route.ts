import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { syncGitHubData } from '@/lib/github';

/**
 * GitHub 데이터 동기화 API
 * POST: 수동 트리거 (api_key 인증)
 * GET: Vercel Cron Job에서 호출 (매일 01:00 UTC)
 */

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  // API 키 인증 — 제공된 경우에만 검증
  if (body.api_key && body.api_key !== process.env.SNAPSHOT_API_KEY) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }

  try {
    const supabase = createServerSupabase();
    const result = await syncGitHubData(supabase);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const result = await syncGitHubData(supabase);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
