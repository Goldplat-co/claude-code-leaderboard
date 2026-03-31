import { createClient } from '@supabase/supabase-js';

// 서버 컴포넌트용 (service role key)
export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
