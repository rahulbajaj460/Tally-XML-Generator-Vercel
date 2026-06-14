# AB Capital — Tally XML Generator (Vercel Edition)

https://tally-xml-generator-vercel.vercel.app

**Fixes the 504 Gateway Timeout — 60 second function timeout on free tier**

---

## Why Vercel Instead of Netlify?

| | Netlify Free | Vercel Free |
|--|--|--|
| Function timeout | ❌ 10 seconds | ✅ 60 seconds |
| Claude API calls | ❌ Times out | ✅ Works fine |
| Cost | Free | Free |

---

## File Structure

```
ab-tally-vercel/
├── index.html          ← Main app (unchanged)
├── vercel.json         ← Vercel config (sets 60s timeout)
├── api/
│   └── tally.js        ← Backend API route
└── README.md
```

---

## Setup Guide

### STEP 1 — Upload to GitHub

1. Go to **github.com** → New repository → name it `ab-tally-xml`
2. Set to **Private** ✅
3. Upload these files:
   - `index.html` → root
   - `vercel.json` → root
   - `api/tally.js` → create `api/` folder, upload inside it

**To create api/tally.js on GitHub:**
- Click "Add file" → "Create new file"
- Type filename as: `api/tally.js`
- Paste the tally.js content → Commit

---

### STEP 2 — Deploy on Vercel

1. Go to **vercel.com** → Sign up / Log in (use GitHub)
2. Click **"Add New Project"**
3. Import your `ab-tally-xml` GitHub repo
4. Framework Preset: **Other**
5. Root Directory: `.` (leave as is)
6. Click **Deploy**

---

### STEP 3 — Add Environment Variables ⚠️

1. Vercel dashboard → Your project → **Settings** → **Environment Variables**
2. Add both variables:

   | Name | Value |
   |------|-------|
   | `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |
   | `TEAM_PASSWORD` | `ABCapital2025` |

3. Click **Save**
4. Go to **Deployments** → click the 3 dots on latest → **Redeploy**

---

### STEP 4 — Test

1. Open your Vercel URL (e.g. `https://ab-tally-xml.vercel.app`)
2. Password: `ABCapital2025`
3. Upload bank statement → Generate → Should work without timeout ✅

---

## If You Still Get Timeouts

For very large PDFs (10+ pages), even 60 seconds may not be enough.
In that case, split the PDF into smaller parts before uploading,
or contact us to upgrade to Vercel Pro (5 min timeout).

---

AB Capital Services FZC · www.abcapital.ae
