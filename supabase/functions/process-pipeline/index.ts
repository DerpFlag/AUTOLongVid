// Supabase Edge Function: process-pipeline
// TTS: ElevenLabs (eleven_turbo_v2_5). Images: Pollinations (gen.pollinations.ai, Z Image, POLLINATIONS_API_KEY). Qwen backup: docs/backups/
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')!;
const POLLINATIONS_API_KEY = Deno.env.get('POLLINATIONS_API_KEY')!;
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Helpers ──

async function updateJob(jobId: string, updates: Record<string, unknown>) {
    const { error } = await supabase
        .from('jobs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', jobId);
    if (error) console.error('Update job error:', error);
}

async function addLog(jobId: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${type.toUpperCase()}] ${message}`);

    const { data } = await supabase.from('jobs').select('logs').eq('id', jobId).single();
    const logs = data?.logs || [];
    logs.push({ message, type, timestamp });

    await updateJob(jobId, { current_task: message, logs });
}

async function setError(jobId: string, msg: string) {
    await addLog(jobId, msg, 'error');
    await updateJob(jobId, { status: 'error', error_message: msg });
}

async function withRetry<T>(
    fn: () => Promise<T>,
    retries = 5,
    delay = 5000,
    onRetry?: (error: any, attempt: number) => void
): Promise<T> {
    let lastError: any;
    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (i < retries) {
                onRetry?.(err, i + 1);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    throw lastError;
}

// ── ElevenLabs TTS ──
// Uses eleven_turbo_v2_5 (good quality vs cost; ~0.06$/1k chars tier, see ElevenLabs docs).
const ELEVENLABS_TTS_MODEL = 'eleven_turbo_v2_5';

// All ElevenLabs premade voices (from GET /v1/voices?show_legacy=true). Key = exact name from API.
const ELEVENLABS_VOICE_MAP: Record<string, string> = {
    'Adam - Dominant, Firm': 'pNInz6obpgDQGcFmaJgB',
    'Alice - Clear, Engaging Educator': 'Xb7hH8MSUJpSbSDYk0k2',
    'Antoni': 'ErXwobaYiN019PkySvjV',
    'Aria': '9BWtsMINqrJLrRacOk9x',
    'Arnold': 'VR6AewLTigWG4xSOukaG',
    'Bella - Professional, Bright, Warm': 'hpp4J3VqNfWAUOO0d1Us',
    'Bill - Wise, Mature, Balanced': 'pqHfZKP75CvOlQylNhV4',
    'Brian - Deep, Resonant and Comforting': 'nPczCjzI2devNBz1zQrb',
    'Callum - Husky Trickster': 'N2lVS1w4EtoT3dr4eOWO',
    'Charlie - Deep, Confident, Energetic': 'IKne3meq5aSn9XLyUdCD',
    'Charlotte': 'XB0fDUnXU5powFXDhCwa',
    'Chris - Charming, Down-to-Earth': 'iP95p4xoKVk53GoZ742B',
    'Clyde': '2EiwWnXFnvU5JabPnv8n',
    'Daniel - Steady Broadcaster': 'onwK4e9ZLuTAKqWW03F9',
    'Dave': 'CYw3kZ02Hs0563khs1Fj',
    'Domi': 'AZnzlk1XvdvUeBnXmlld',
    'Dorothy': 'ThT5KcBeYPX3keUQqHPh',
    'Drew': '29vD33N1CtxCmqQRPOHJ',
    'Elli': 'MF3mGyEYCl7XYWbV9V6O',
    'Emily': 'LcfcDJNUP1GQjkzn1xUU',
    'Eric - Smooth, Trustworthy': 'cjVigY5qzO86Huf0OWal',
    'Ethan': 'g5CIjZEefAph4nQFvHAz',
    'Fin': 'D38z5RcWu1voky8WS1ja',
    'Freya': 'jsCqWAovK2LkecY7zXl4',
    'George - Warm, Captivating Storyteller': 'JBFqnCBsd6RMkjVDRZzb',
    'Gigi': 'jBpfuIE2acCO8z3wKNLl',
    'Giovanni': 'zcAOhNBS3c14rBihAFp1',
    'Glinda': 'z9fAnlkpzviPz146aGWa',
    'Grace': 'oWAxZDx7w5VEj9dCyTzz',
    'Harry - Fierce Warrior': 'SOYHLrjzK2X1ezoPC6cr',
    'James': 'ZQe5CZNOzWyzPSCn5a3c',
    'Jeremy': 'bVMeCyTHy58xNoL34h3p',
    'Jessica - Playful, Bright, Warm': 'cgSgspJ2msm6clMCkdW9',
    'Jessie': 't0jbNlBVZ17f02VDIeMI',
    'Joseph': 'Zlb1dXrM653N07WRdFW3',
    'Josh': 'TxGEqnHWrfWFTfGW9XjX',
    'Laura - Enthusiast, Quirky Attitude': 'FGY2WhTYpPnrIDTdsKH5',
    'Liam - Energetic, Social Media Creator': 'TX3LPaxmHKxFdv7VOQHJ',
    'Lily - Velvety Actress': 'pFZP5JQG7iQjIQuC4Bku',
    'Matilda - Knowledgable, Professional': 'XrExE9yKIg1WjnnlVkGX',
    'Michael': 'flq6f7yk4E4fJM5XTYuZ',
    'Mimi': 'zrHiDhphv9ZnVXBqCLjz',
    'Nicole': 'piTKgcLEGmPE4e6mEKli',
    'Patrick': 'ODq5zmih8GrVes37Dizd',
    'Paul': '5Q0t7uMcjvnagumLfvZi',
    'Rachel': '21m00Tcm4TlvDq8ikWAM',
    'River - Relaxed, Neutral, Informative': 'SAz9YHcvj6GT2YYXdXww',
    'Roger - Laid-Back, Casual, Resonant': 'CwhRBWXzGAHq8TQ4Fs17',
    'Sam': 'yoZ06aMxZJJ28mfd3POQ',
    'Sarah - Mature, Reassuring, Confident': 'EXAVITQu4vr4xnSDxMaL',
    'Serena': 'pMsXgVXv3BLzUgSXRplE',
    'Thomas': 'GBv7mTt0atIp3Br8iCZE',
    'Will - Relaxed Optimist': 'bIHbv24MWmeRgasZH58o',
};

async function elevenLabsTTS(text: string, voiceLabelOrId: string): Promise<Uint8Array> {
    if (!ELEVENLABS_API_KEY) {
        throw new Error('ELEVENLABS_API_KEY is not set. Configure it in Supabase Edge Function secrets.');
    }

    const voiceId = ELEVENLABS_VOICE_MAP[voiceLabelOrId] || voiceLabelOrId;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
            text,
            model_id: ELEVENLABS_TTS_MODEL,
            // Reasonable defaults; can be tuned later if needed.
            voice_settings: {
                stability: 0.6,
                similarity_boost: 0.8,
                style: 0.4,
                use_speaker_boost: true,
            },
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`ElevenLabs TTS ${res.status}: ${errText.slice(0, 400)}`);
    }

    const buffer = await res.arrayBuffer();
    if (!buffer.byteLength) {
        throw new Error('ElevenLabs TTS returned empty audio');
    }
    return new Uint8Array(buffer);
}

// ── Step 1: Generate JSONs ──
async function generateJsons(jobId: string, script: string, segmentCount: number) {
    await addLog(jobId, 'Breaking script into segments and generating prompts...');
    await updateJob(jobId, { status: 'generating_jsons', progress: 5 });

    const model = 'arcee-ai/trinity-large-preview:free';
    // Voice prompt: RAW text → N spoken paragraphs as JSON; segment_count = number of prompts; each ~25 words (~10s)
    const voicePrompt = `You are a professional voiceover script editor.

TASK: Split the RAW text into EXACTLY ${segmentCount} segments. Output valid JSON only with keys voice1 to voice${segmentCount}.

CRITICAL — WORD COUNT: Every segment must be around 20–30 words (aim for ~25). Count the words. Segments that are only 1–2 sentences or under ~15 words are WRONG and must be expanded. Each segment should take roughly 8–12 seconds to read aloud.

Output format:
{
  "voice1": "first segment text, ~25 words",
  "voice2": "second segment text, ~25 words",
  ...
  "voice${segmentCount}": "last segment text, ~25 words"
}

Rules:

1) Produce EXACTLY ${segmentCount} paragraphs: voice1 → voice${segmentCount}.
   Each paragraph MUST be around 20–30 words (aim for ~25). Do not output short 1–2 sentence chunks.
   Maintain logical and narrative flow across segments.

2) Rewrite for speech:
   - Use conversational language
   - Prefer short, clear sentences
   - Improve rhythm and pacing
   - Use natural transitions
   - Remove awkward phrasing
   - Preserve meaning and key facts

3) Optimize for text-to-speech:
   - Avoid long or nested sentences
   - Avoid symbols, lists, and formatting
   - Avoid uncommon abbreviations
   - Spell out numbers when helpful
   - Use punctuation to guide pauses

4) Do NOT include:
   - Inline performance instructions
   - Stage directions
   - Bracketed emotion tags
   - Markup or metadata
   - Explanations
   - Markdown
   - Extra text

5) Output ONLY valid JSON.
   No comments. No trailing commas. No text outside JSON.

RAW TEXT:
${script}`;

    try {
        const { cleanVoice, cleanImage } = await withRetry(async () => {
            const voiceRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENROUTER_API_KEY}` },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: 'You are a professional voiceover script editor. You always output exactly the requested number of segments. Every segment must be around 20-30 words (aim for ~25); very short segments are invalid.' },
                        { role: 'user', content: voicePrompt }
                    ],
                    temperature: 0.7,
                }),
            });
            const voiceData = await voiceRes.json();
            const rawVoice = voiceData.choices?.[0]?.message?.content || '{}';
            const cleanVoice = rawVoice.replace(/```json | ```/g, '').trim();

            // Image prompt: voice JSON → N image prompts (dynamic by segment_count); uses generated voice JSON
            const imagePrompt = `You are an expert visual designer and prompt engineer.

Your task is: Given a JSON of ${segmentCount} text paragraphs (voice1 → voice${segmentCount}), generate a **new JSON with ${segmentCount} image generation prompts** that correspond to each paragraph. Each prompt should describe a **key visual representative frame** for the paragraph.

Requirements:

1. Output must be **valid JSON only**, keys "image1" to "image${segmentCount}", values are strings. No explanations, markdown, instructions, or extra text.
2. Each prompt should describe a **single, clear image** representing the paragraph.
3. Maintain a **consistent visual style** across all prompts:
   - Color palette (e.g., cinematic, moody, vibrant, pastel)
   - Character design (age, gender, clothing, expression)
   - Background style (interior, exterior, lighting, weather)
4. Include **rich visual details**:
   - Lighting (soft, harsh, golden hour, neon, shadows)
   - Composition (foreground, background, perspective)
   - Objects and environment
   - Emotions conveyed by scene
5. The prompt should be concise but descriptive enough to generate a **high-quality, static first frame** for a video.
6. Do NOT include explanations, instructions, markdown, or extra text.

Example format:
{
  "image1": "A young woman standing on a rainy street under neon lights, reflective puddles, cinematic moody palette, detailed skyscraper background, soft rain, contemplative expression, key visual representative frame",
  "image2": "..."
}

Input JSON:
${cleanVoice}`;
            const imageRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENROUTER_API_KEY}` },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: 'You are a storyboard artist.' },
                        { role: 'user', content: imagePrompt }
                    ],
                    temperature: 0.7,
                }),
            });
            const imageData = await imageRes.json();
            const rawImage = imageData.choices?.[0]?.message?.content || '{}';
            const cleanImage = rawImage.replace(/```json | ```/g, '').trim();

            return { cleanVoice, cleanImage };
        }, 5, 5000, (err, count) => addLog(jobId, `Retrying prompt generation(Attempt ${count} / 5)...`, 'warning'));

        await addLog(jobId, 'Prompts successfully generated and validated.', 'success');
        await updateJob(jobId, {
            voice_json: cleanVoice,
            image_json: cleanImage,
            progress: 10,
        });

        return { voiceJson: cleanVoice, imageJson: cleanImage };
    } catch (err) {
        throw new Error(`OpenRouter failed: ${err instanceof Error ? err.message : String(err)} `);
    }
}

const TTS_SEGMENT_DELAY_MS = 800;

// ── Step 2: Generate Voice (ElevenLabs) ──
async function generateVoice(jobId: string, voiceJson: string, speaker: string) {
    await updateJob(jobId, { status: 'generating_voice', progress: 35 });
    const resolvedVoice = ELEVENLABS_VOICE_MAP[speaker] ? speaker : speaker || 'Ivanna';
    await addLog(jobId, `Synthesizing voice using ElevenLabs (${resolvedVoice})...`);

    const voices = JSON.parse(voiceJson);
    const voiceKeys = Object.keys(voices);
    const outputFolder = `job_${jobId}`;

    for (let i = 0; i < voiceKeys.length; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, TTS_SEGMENT_DELAY_MS));

        const text = voices[voiceKeys[i]];
        await addLog(jobId, `Synthesizing voice segment ${i + 1}/${voiceKeys.length}...`);

        try {
            const audioBytes = await withRetry(
                () => elevenLabsTTS(text, resolvedVoice),
                3, 3000,
                (err, count) => addLog(jobId, `Retrying segment ${i + 1} (Attempt ${count}/3): ${err instanceof Error ? err.message : String(err)}`, 'warning')
            );

            await supabase.storage
                .from('pipeline_output')
                .upload(`${outputFolder}/audio/voice_${i + 1}.mp3`, audioBytes, {
                    contentType: 'audio/mpeg',
                    upsert: true,
                });

            await addLog(jobId, `Voice segment ${i + 1} finalized and stored.`);
        } catch (err) {
            await addLog(jobId, `Voice segment ${i + 1} failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
            await addLog(jobId, i + 1 < voiceKeys.length ? `Skipping segment ${i + 1}; continuing with segment ${i + 2} of ${voiceKeys.length}.` : `Skipping segment ${i + 1}. Voice step done.`, 'warning');
            await updateJob(jobId, { progress: Math.min(35 + Math.floor(((i + 1) / voiceKeys.length) * 5), 39) });
        }
    }

    await addLog(jobId, 'Voice synthesis step complete.', 'success');
    await updateJob(jobId, { progress: 40 });
}

const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
const GITHUB_REPO = Deno.env.get('GITHUB_REPO') || "DerpFlag/ai_video";

async function triggerStitcher(jobId: string, segmentCount: number) {
    if (!GITHUB_TOKEN) {
        await addLog(jobId, 'GitHub Token missing. Video stitching cannot start automatically.', 'warning');
        return;
    }

    await addLog(jobId, 'Triggering video assembly (GitHub Actions)...');
    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event_type: 'stitch_video',
                client_payload: {
                    job_id: jobId,
                    segment_count: segmentCount
                }
            })
        });

        if (res.ok) {
            await addLog(jobId, 'Stitcher triggered! Final video will be ready in a few minutes.', 'success');
            await updateJob(jobId, { status: 'stitching', progress: 70 });
        } else {
            const err = await res.text();
            throw new Error(`GitHub API error: ${err}`);
        }
    } catch (err: any) {
        await addLog(jobId, `Stitcher trigger failed: ${err.message}`, 'error');
    }
}

// ── Step 3: Generate Images (Pollinations only, Z Image) ──
// Tested: GET gen.pollinations.ai/image/{prompt}?model=zimage&width=1920&height=1080 + Authorization: Bearer KEY → 200 image/jpeg
const POLLINATIONS_IMAGE_BASE = "https://gen.pollinations.ai/image";

// Use 1280x720 to reduce memory pressure on edge (WORKER_LIMIT); stitcher can still produce 1080p.
async function generateOneImagePollinations(prompt: string): Promise<ArrayBuffer> {
    const url = `${POLLINATIONS_IMAGE_BASE}/${encodeURIComponent(prompt)}?model=zimage&width=1280&height=720`;
    const res = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${POLLINATIONS_API_KEY}` },
    });
    const body = await res.arrayBuffer();
    if (!res.ok) {
        const errText = body.byteLength > 0 ? new TextDecoder().decode(body).slice(0, 400) : res.statusText;
        throw new Error(`Pollinations ${res.status}: ${errText || res.statusText}`);
    }
    if (body.byteLength === 0) throw new Error('Pollinations returned empty image');
    return body;
}

async function generateImages(jobId: string, imageJson: string) {
    if (!POLLINATIONS_API_KEY) {
        await addLog(jobId, 'Image generation skipped: POLLINATIONS_API_KEY not set.', 'error');
        await setError(jobId, 'POLLINATIONS_API_KEY is required for image generation. Set it in Supabase secrets.');
        throw new Error('POLLINATIONS_API_KEY not set');
    }
    await updateJob(jobId, { status: 'generating_images', progress: 40 });
    await addLog(jobId, 'Generating images with Pollinations (Z Image)...');
    const images = JSON.parse(imageJson);
    const imageKeys = Object.keys(images);
    const outputFolder = `job_${jobId}`;

    for (let i = 0; i < imageKeys.length; i++) {
        const prompt = images[imageKeys[i]];
        await addLog(jobId, `Creating visual frame ${i + 1}/${imageKeys.length}...`);

        try {
            const imgBuffer = await withRetry(
                () => generateOneImagePollinations(prompt),
                3,
                4000,
                (err, count) => addLog(jobId, `Retry ${count}/3: ${err instanceof Error ? err.message : String(err)}`, 'warning')
            );

            if (imgBuffer && imgBuffer.byteLength > 0) {
                await supabase.storage
                    .from('pipeline_output')
                    .upload(`${outputFolder}/images/image_${i + 1}.jpg`, new Uint8Array(imgBuffer), {
                        contentType: 'image/jpeg',
                        upsert: true,
                    });
                await updateJob(jobId, { progress: 40 + Math.floor(((i + 1) / imageKeys.length) * 30) });
                // Spread load to avoid WORKER_LIMIT (memory/CPU) on free tier
                if (i + 1 < imageKeys.length) await new Promise(r => setTimeout(r, 2000));
            } else {
                throw new Error('Image generation returned no data');
            }
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            await addLog(jobId, `Image ${i + 1} failed: ${errMsg}`, 'error');
        }
    }

    await addLog(jobId, 'Image generation complete.', 'success');
}

// Generate and upload a single image by index (used for per-invocation phase to avoid WORKER_LIMIT).
async function generateOneImageByIndex(jobId: string, imageJson: string, index: number): Promise<void> {
    const images = JSON.parse(imageJson);
    const keys = Object.keys(images).sort();
    const key = keys[index];
    if (!key) throw new Error(`No image prompt for index ${index}`);
    const prompt = images[key];
    const outputFolder = `job_${jobId}`;
    const imgBuffer = await withRetry(
        () => generateOneImagePollinations(prompt),
        3,
        4000,
        (err, count) => addLog(jobId, `Retry ${count}/3: ${err instanceof Error ? err.message : String(err)}`, 'warning')
    );
    if (!imgBuffer?.byteLength) throw new Error('Image generation returned no data');
    await supabase.storage
        .from('pipeline_output')
        .upload(`${outputFolder}/images/image_${index + 1}.jpg`, new Uint8Array(imgBuffer), {
            contentType: 'image/jpeg',
            upsert: true,
        });
}

// ── Main Handler ──
// Phase 2 can be: "images" (all in one, may hit WORKER_LIMIT), "image_one" (one image per invocation), or "stitcher_only".
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const body = await req.json();
        const { phase, job_id: phase2JobId, index: imageIndex } = body;

        if (phase === 'stitcher_only' && phase2JobId) {
            const { data: job, error: jobError } = await supabase
                .from('jobs')
                .select('segment_count')
                .eq('id', phase2JobId)
                .single();
            if (jobError || !job) {
                return new Response(JSON.stringify({ error: 'Job not found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
            await triggerStitcher(phase2JobId, Number(job.segment_count) || 5);
            return new Response(JSON.stringify({ success: true, phase: 'stitcher_only' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (phase === 'image_one' && phase2JobId != null && typeof imageIndex === 'number') {
            const { data: job, error: jobError } = await supabase
                .from('jobs')
                .select('image_json, segment_count')
                .eq('id', phase2JobId)
                .single();
            if (jobError || !job?.image_json) {
                return new Response(JSON.stringify({ error: 'Job not found or missing image_json' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
            const imageJson = typeof job.image_json === 'string' ? job.image_json : JSON.stringify(job.image_json);
            const segCount = Number(job.segment_count) || 5;
            await addLog(phase2JobId, `Generating image ${imageIndex + 1}/${segCount}...`, 'info');
            await updateJob(phase2JobId, { status: 'generating_images', progress: 40 + Math.floor(((imageIndex + 1) / segCount) * 30) });
            try {
                await generateOneImageByIndex(phase2JobId, imageJson, imageIndex);
                await addLog(phase2JobId, `Image ${imageIndex + 1}/${segCount} stored.`, 'info');
            } catch (err) {
                await addLog(phase2JobId, `Image ${imageIndex + 1} failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
            }
            return new Response(JSON.stringify({ success: true, phase: 'image_one', index: imageIndex }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (phase === 'images' && phase2JobId) {
            await addLog(phase2JobId, 'Phase 2 started: loading job and generating images...', 'info');
            const { data: job, error: jobError } = await supabase
                .from('jobs')
                .select('image_json, segment_count')
                .eq('id', phase2JobId)
                .single();
            if (jobError || !job?.image_json) {
                await addLog(phase2JobId, `Phase 2 error: ${jobError?.message || 'missing image_json'}`, 'error');
                return new Response(JSON.stringify({ error: 'Job not found or missing image_json' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
            const imageJson = typeof job.image_json === 'string' ? job.image_json : JSON.stringify(job.image_json);
            try {
                await generateImages(phase2JobId, imageJson);
                await triggerStitcher(phase2JobId, Number(job.segment_count) || 5);
            } catch (err) {
                await setError(phase2JobId, err instanceof Error ? err.message : String(err));
            }
            return new Response(JSON.stringify({ success: true, phase: 'images' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { job_id, script, voice_name, segment_count } = body;
        const segmentCount = Math.min(Math.max(parseInt(String(segment_count), 10) || 5, 1), 60);

        // 1. Determine the ElevenLabs speaker to use (label must exist in ELEVENLABS_VOICE_MAP or be a raw voice_id)
        const finalSpeaker = voice_name || 'Rachel';

        // Phase 1 only: prompts + voice. Phase 2 (images + stitcher) is triggered by the webapp after this returns.
        try {
            const { voiceJson, imageJson } = await generateJsons(job_id, script, segmentCount);
            await generateVoice(job_id, voiceJson, finalSpeaker);
        } catch (err) {
            await setError(job_id, err instanceof Error ? err.message : String(err));
        }

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (err) {
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
