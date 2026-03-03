import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('supabaseUrl is required.');
    return createClient(url, key);
}

export async function POST(req: NextRequest) {
    try {
        const supabase = getSupabase();
        const body = await req.json();
        const { script, voice_name, segment_count } = body;

        if (!script || !voice_name || !segment_count) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Create job row in Supabase
        const { data: job, error: dbError } = await supabase
            .from('jobs')
            .insert({
                script,
                voice_name: voice_name || 'en-US-AndrewMultilingualNeural',
                segment_count: parseInt(segment_count) || 5,
                status: 'pending',
                progress: 0,
            })
            .select()
            .single();

        if (dbError || !job) {
            console.error('DB Error:', dbError);
            return NextResponse.json({ success: false, error: dbError?.message || 'Failed to create job' }, { status: 500 });
        }

        // 2. Run phase 1 (prompts + voice), then trigger phase 2 (images + stitcher). We await so phase 2 runs before returning.
        const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-pipeline`;
        const segmentCount = parseInt(segment_count) || 5;
        const authHeader = `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;

        const phase1 = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
            body: JSON.stringify({
                job_id: job.id,
                script,
                voice_name: voice_name || 'en-US-AndrewMultilingualNeural',
                segment_count: segmentCount,
            }),
        });
        if (!phase1.ok) {
            const errText = await phase1.text();
            console.error('Phase 1 failed:', phase1.status, errText);
            return NextResponse.json({ success: false, error: `Pipeline phase 1 failed: ${phase1.status}` }, { status: 502 });
        }

        // Phase 2: one invocation per image (avoids WORKER_LIMIT), then stitcher
        for (let i = 0; i < segmentCount; i++) {
            const imgRes = await fetch(edgeFunctionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
                body: JSON.stringify({ phase: 'image_one', job_id: job.id, index: i }),
            });
            if (!imgRes.ok) {
                const errText = await imgRes.text();
                console.error(`Phase 2 image ${i + 1} failed:`, imgRes.status, errText);
                return NextResponse.json({ success: false, error: `Image ${i + 1} failed: ${imgRes.status}` }, { status: 502 });
            }
        }
        const stitchRes = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
            body: JSON.stringify({ phase: 'stitcher_only', job_id: job.id }),
        });
        if (!stitchRes.ok) {
            const errText = await stitchRes.text();
            console.error('Stitcher trigger failed:', stitchRes.status, errText);
            return NextResponse.json({ success: false, error: `Stitcher failed: ${stitchRes.status}` }, { status: 502 });
        }

        return NextResponse.json({ success: true, job_id: job.id });
    } catch (err) {
        console.error('Submit error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
