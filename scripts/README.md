# Scripts

## test-zimage.js — Z-Image-Turbo via Hugging Face API

Tests **Z-Image-Turbo** (Tongyi-MAI) via Hugging Face Inference API by generating 5 images and saving them to `scripts/test-output/`.

**Run (from repo root):**

```bash
# Set your Hugging Face token (same one used in Supabase secrets for the pipeline)
# Windows PowerShell:
$env:HF_TOKEN = "hf_your_token_here"
node scripts/test-zimage.js

# Windows CMD:
set HF_TOKEN=hf_your_token_here
node scripts/test-zimage.js

# Linux/macOS:
HF_TOKEN=hf_your_token_here node scripts/test-zimage.js
```

Get your token from [Hugging Face → Settings → Access Tokens](https://huggingface.co/settings/tokens). It’s the same `HF_TOKEN` you set with `supabase secrets set HF_TOKEN=...` for the edge function.

If all 5 images are created in `scripts/test-output/`, Z-Image-Turbo is working and can replace FLUX in the pipeline.
