# AUTOLongVid

**Turn text scripts into long-format AI videos.** Paste your script, pick a voice and duration, and the pipeline generates voiceover, images, and a stitched video in the cloud.

**Live app:** [autolongvid.vercel.app](https://autolongvid.vercel.app)

---

## What it does

- **Input:** A long-form text script (article, story, etc.).
- **Pipeline:** The app splits the script into segments, rewrites them for natural speech (LLM), generates voice (ElevenLabs), images (Pollinations), and stitches everything into a single video (GitHub Actions / Render).
- **Output:** A finished video you can watch in the app or download from storage.

No local compute — everything runs in the cloud (Supabase, Vercel, and your chosen stitcher).

---

## Repo structure

| Folder | Purpose |
|--------|---------|
| `webapp/` | Next.js app (Vercel). Deploy with **Root Directory** = `webapp`. |
| `supabase/` | DB setup (`setup.sql`), Edge Function `process-pipeline` (prompts, TTS, images, stitcher trigger). |
| `stitcher/` | Video assembly: downloads audio + images, runs FFmpeg, uploads final video. (GitHub Actions or Render.) |
| `scripts/` | Utilities: `run-pipeline-test.js`, `fetch-eleven-voices.js`. |

---

## Quick start

1. **Supabase:** Run `supabase/setup.sql` in your project; deploy the Edge Function and set secrets (OpenRouter, ElevenLabs, GitHub token, etc.).
2. **Webapp:** In `webapp/`, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (e.g. in `.env.local` or Vercel env).
3. **Vercel:** Import this repo, set **Root Directory** to `webapp`, add the env vars above, deploy.

For detailed setup (DB, storage, stitcher workflow), see `webapp/SETUP.md`.
