import { createBrowserClient } from '@supabase/ssr';

// 브라우저 클라이언트용 (anon key + 쿠키 기반 인증)
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
