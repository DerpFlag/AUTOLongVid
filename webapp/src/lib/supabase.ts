import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
    if (!_client) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) throw new Error('Supabase env (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) is required.');
        _client = createClient(url, key);
    }
    return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
    get(_, prop) {
        return (getClient() as unknown as Record<string, unknown>)[prop as string];
    },
});

export type Job = {
  id: string;
  created_at: string;
  script: string;
  voice_name: string;
  segment_count: number;
  status: string;
  progress: number;
  voice_json: string | null;
  image_json: string | null;
  error_message: string | null;
  output_folder: string | null;
  current_task: string | null;
  logs: Array<{ message: string; type: string; timestamp: string }> | null;
};
