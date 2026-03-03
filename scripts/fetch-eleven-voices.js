/**
 * Fetch all premade ElevenLabs voices for the webapp/edge function.
 * Usage: ELEVENLABS_API_KEY=sk_... node scripts/fetch-eleven-voices.js
 * Outputs JSON: [{ name, voice_id }, ...] for category premade (and legacy premade if any).
 */
const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error('Set ELEVENLABS_API_KEY');
  process.exit(1);
}

async function main() {
  const res = await fetch('https://api.elevenlabs.io/v1/voices?show_legacy=true', {
    headers: { 'xi-api-key': key },
  });
  if (!res.ok) {
    console.error('API error', res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  const voices = data.voices || [];
  const premade = voices.filter(v => (v.category || '').toLowerCase() === 'premade' || (v.category || '').toLowerCase() === 'default');
  const list = premade.map(v => ({ name: v.name, voice_id: v.voice_id })).sort((a, b) => a.name.localeCompare(b.name));
  console.log(JSON.stringify(list, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
