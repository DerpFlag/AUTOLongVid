# AUTOLongVid — Webapp

Next.js frontend for [AUTOLongVid](https://github.com/DerpFlag/AUTOLongVid). Deployed at **[autolongvid.vercel.app](https://autolongvid.vercel.app)**.

## Run locally

```bash
npm install
cp .env.example .env.local   # then set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

Import the repo with **Root Directory** = `webapp`. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

See root [README](../README.md) and [SETUP.md](./SETUP.md) for full pipeline setup.
