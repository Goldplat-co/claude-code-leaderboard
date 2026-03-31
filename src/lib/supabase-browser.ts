import { createClient } from '@supabase/supabase-js';

// 브라우저 클라이언트용 (anon key)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
