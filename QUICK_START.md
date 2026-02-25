# autonomousART Quick Start

Get autonomousART running in 5 minutes.

## 1. Create GitHub Repository

```bash
# On GitHub.com:
# 1. Create new public repo named "autonomousART"
# 2. Copy the HTTPS URL
```

## 2. Push to GitHub

```bash
cd /home/eliza/qwen/autonomousART

# Add remote
git remote add origin https://github.com/<username>/autonomousART.git
git branch -M main

# Push
git push -u origin main
```

## 3. Enable GitHub Pages

1. Go to repo **Settings** → **Pages**
2. Select: Branch `main`, Folder `/ (root)`
3. Save

Your gallery will be at: `https://<username>.github.io/autonomousART/`

## 4. Enable Workflows (Optional)

1. Go to **Actions** tab
2. Enable workflows
3. Artworks will auto-generate every 6 hours

## 5. Setup WSL Autostart (Optional)

### Windows Task Scheduler

1. Open **Task Scheduler**
2. Create **New Task**:
   - Name: `autonomousART Loop`
   - Trigger: **At startup**
   - Action: Start `wsl.exe`
   - Arguments: `/home/eliza/qwen/autonomousART/scripts/ralph-art-loop.sh`
   - Check "Run with highest privileges"

## Manual Generation

Generate artwork manually:

```bash
cd /home/eliza/qwen/autonomousART

# One-time cycle
bash scripts/ralph-art-loop.sh once

# Start continuous loop
bash scripts/ralph-art-loop.sh run

# Show help
bash scripts/ralph-art-loop.sh help
```

## View Locally

```bash
# Start web server
python3 -m http.server 8000

# Visit: http://localhost:8000
```

## Adding AI Concepts (Optional)

1. Get free API key from https://aistudio.google.com
2. In GitHub Settings → Secrets:
   - Add `GEMINI_API_KEY`
3. Workflows will use AI to generate concepts

Without API key, system uses creative fallback concepts.

## File Structure

```
artworks/              ← Generated art pieces
├── 20260225-115942-cellular-awakening.html
├── 20260225-083000-particle-entropy.html
└── ...

scripts/
├── concept-selector.js      ← Pick art concept
├── art-generator.js         ← Create HTML/Canvas art
├── build-gallery.js         ← Index artworks
└── ralph-art-loop.sh        ← Autostart script

styles/
└── gallery.css              ← Gallery styling

index.html                    ← Gallery homepage
artworks-list.json          ← Auto-generated index
```

## Next Steps

- Customize prompts: `prompts/art-generation.txt`
- Add new techniques: `scripts/art-generator.js`
- Modify styles: `styles/gallery.css`
- Test locally before GitHub Push

---

**Done! Your autonomous art gallery is ready.** 🎨
