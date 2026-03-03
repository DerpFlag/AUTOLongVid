/**
 * Create a job and trigger process-pipeline (4 segments, test script).
 * Usage: node scripts/run-pipeline-test.js
 * Loads webapp/.env.local for Supabase URL and anon key if present.
 */
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '../webapp/.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const SCRIPT = `The arena shakes as Goku powers up to Super Saiyan Blue, golden aura crackling like lightning, eyes locked on the grinning rubber pirate. "You're tough, kid—let's see what ya got!" Goku roars, blasting forward with a Kamehameha wave that scorches the air. Luffy laughs wildly, Gear 5 activating in a burst of cartoonish white hair and freedom-fueled chaos—his body morphs into a giant, bouncy fist bigger than a mountain, slamming down with "Gomu Gomu no Dawn Rocket!" The beams collide in a cataclysmic explosion, sending shockwaves that shatter boulders. Goku dodges elastic punches that twist reality itself, countering with rapid Dragon Fist jabs that stretch Luffy like taffy across the battlefield. "Not bad!" Luffy whoops, inflating into a massive balloon to bounce Goku skyward before unleashing Bajrang Gun—a colossal, sky-piercing punch infused with Haki. Goku grins, Instant Transmissioning behind for a Spirit Bomb-charged haymaker. Fists fly in a blur of ki blasts and rubbery rebounds, the ground crumbling as two unbreakable wills push each other to the brink—who will claim victory in this multiverse melee?`;

async function main() {
  if (!SUPABASE_URL || !ANON_KEY) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (e.g. in webapp/.env.local)');
    process.exit(1);
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      script: SCRIPT,
      voice_name: 'Rachel',
      segment_count: 1,
      status: 'pending',
      progress: 0,
    }),
  });
  if (!res.ok) {
    console.error('Create job failed:', res.status, await res.text());
    process.exit(1);
  }
  const [job] = await res.json();
  const jobId = job.id;
  console.log('Created job:', jobId);

  const phase1Res = await fetch(`${SUPABASE_URL}/functions/v1/process-pipeline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({
      job_id: jobId,
      script: SCRIPT,
      voice_name: 'Rachel',
      segment_count: 1,
    }),
  });
  console.log('Phase 1 response:', phase1Res.status, await phase1Res.text());
  if (!phase1Res.ok) {
    console.error('Phase 1 failed; aborting.');
    process.exit(1);
  }

  const segmentCount = 1;
  for (let i = 0; i < segmentCount; i++) {
    const imgRes = await fetch(`${SUPABASE_URL}/functions/v1/process-pipeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ phase: 'image_one', job_id: jobId, index: i }),
    });
    console.log(`Phase 2 image ${i + 1}/${segmentCount}:`, imgRes.status, await imgRes.text());
    if (!imgRes.ok) {
      console.error('Phase 2 image failed.');
      process.exit(1);
    }
  }
  const stitchRes = await fetch(`${SUPABASE_URL}/functions/v1/process-pipeline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ phase: 'stitcher_only', job_id: jobId }),
  });
  console.log('Stitcher trigger:', stitchRes.status, await stitchRes.text());
  if (!stitchRes.ok) {
    console.error('Stitcher failed.');
    process.exit(1);
  }

  console.log('\nPolling job status (every 10s, up to ~3 min)...');
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const statusRes = await fetch(`${SUPABASE_URL}/rest/v1/jobs?id=eq.${jobId}&select=status,progress,current_task,logs,error_message`, {
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` },
    });
    const [row] = await statusRes.json();
    if (!row) break;
    console.log(`  [${(i + 1) * 10}s] status=${row.status} progress=${row.progress} task=${row.current_task || '-'}`);
    if (row.error_message) console.log('  error:', row.error_message);
    if (row.status === 'complete' || row.status === 'error') break;
  }
  console.log('\nDone. Check job in dashboard or webapp.');
}

main().catch(e => { console.error(e); process.exit(1); });
