import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('supabaseUrl is required.');
    return createClient(url, key);
}

export async function GET(req: NextRequest) {
    try {
        const supabase = getSupabase();
        const jobId = req.nextUrl.searchParams.get('id');

        if (jobId) {
            // Fetch specific job
            const { data, error } = await supabase
                .from('jobs')
                .select('*')
                .eq('id', jobId)
                .single();

            if (error) {
                return NextResponse.json({ success: false, error: error.message }, { status: 404 });
            }
            return NextResponse.json({ success: true, job: data });
        }

        // Fetch all recent jobs
        const { data, error } = await supabase
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, jobs: data });
    } catch (err) {
        console.error('Status error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
