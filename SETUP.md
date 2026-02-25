# autonomousART Setup Guide

Complete setup for autonomousART on GitHub Pages and Windows WSL.

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Name: `autonomousART`
3. Description: "AI-powered generative art gallery"
4. Make it **public**
5. Click **Create repository**

## Step 2: Clone & Setup Locally

```bash
cd /home/eliza/qwen
git clone https://github.com/<username>/autonomousART.git
cd autonomousART
git branch -M main
```

## Step 3: Enable GitHub Pages

1. Go to repository **Settings**
2. Click **Pages** (left sidebar)
3. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/ (root)**
4. Click **Save**

Your site will be live at: `https://<username>.github.io/autonomousART/`

## Step 4: Configure GitHub Actions

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add (optional, for AI-generated concepts):
   - **GEMINI_API_KEY**: Your Gemini API key from https://aistudio.google.com
   - OR any other AI API key

Without an API key, the system uses built-in fallback concepts.

## Step 5: Enable Workflows

1. Go to **Actions** tab
2. Click "I understand my workflows, go ahead and enable them"
3. Enable the "Autonomous Art Generation" workflow

## Step 6: Push Initial Code

```bash
cd /home/eliza/qwen/autonomousART
git add .
git commit -m "Initial autonomousART setup"
git push -u origin main
```

## Step 7: Test Manually (Optional)

```bash
# Generate a concept
node scripts/concept-selector.js

# Generate artwork
node scripts/art-generator.js

# Build gallery
node scripts/build-gallery.js

# Commit and push
git add .
git commit -m "Test: generated first artwork"
git push origin main
```

## Step 8: Setup Windows WSL Autostart (Optional)

This will run the art generator automatically every 6 hours on your Windows machine.

### Create Autostart Script

**File: `/home/eliza/qwen/autonomousART/scripts/ralph-art-loop.sh`**

```bash
#!/bin/bash

# autonomousART Loop - Autonomous Art Generator
# Runs every 6 hours, generates art, commits and pushes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
INTERVAL_SECONDS=21600  # 6 hours

log_info() { echo "[INFO] $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_success() { echo "[SUCCESS] $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_error() { echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') - $1"; }

generate_artwork() {
    log_info "Generating new artwork..."
    cd "$PROJECT_DIR"
    
    node "$SCRIPT_DIR/concept-selector.js" || return 1
    node "$SCRIPT_DIR/art-generator.js" || return 1
    node "$SCRIPT_DIR/build-gallery.js" || return 1
    
    log_success "Artwork generation complete"
    return 0
}

commit_and_push() {
    log_info "Committing and pushing..."
    cd "$PROJECT_DIR"
    
    git config user.name "autonomousART Bot" 2>/dev/null || true
    git config user.email "bot@autonomousart.local" 2>/dev/null || true
    
    if git status --porcelain | grep -q "artworks/"; then
        ARTWORK=$(git status --porcelain | grep "artworks/" | awk '{print $2}' | xargs -n1 basename | head -1)
        git add artworks/ artworks-list.json
        git commit -m "🎨 [AUTO] New artwork: ${ARTWORK}"
        
        if git push origin main 2>/dev/null; then
            log_success "Pushed to remote"
        else
            log_error "Push failed"
        fi
    else
        log_info "No new artworks to commit"
    fi
}

main() {
    log_info "========================================="
    log_info "🎨 autonomousART Loop Starting..."
    log_info "========================================="
    
    while true; do
        echo ""
        log_info "🚀 Starting generation cycle"
        
        if generate_artwork; then
            commit_and_push
            log_success "Cycle complete! Next in $((INTERVAL_SECONDS / 3600)) hours"
        else
            log_error "Generation failed"
        fi
        
        log_info "Sleeping for $((INTERVAL_SECONDS / 3600)) hours..."
        sleep $INTERVAL_SECONDS
    done
}

main
```

### Add Execute Permission

```bash
chmod +x /home/eliza/qwen/autonomousART/scripts/ralph-art-loop.sh
```

### Create Windows Task (for WSL autostart)

1. Open **Task Scheduler** (search in Windows)
2. Click **Create Task**
3. **General tab:**
   - Name: `autonomousART Loop`
   - Check "Run whether user is logged in or not"
   - Check "Run with highest privileges"

4. **Triggers tab:**
   - Click **New**
   - Begin task: **At startup**
   - Click **OK**

5. **Actions tab:**
   - Click **New**
   - Action: **Start a program**
   - Program: `wsl.exe`
   - Arguments: `/home/eliza/qwen/autonomousART/scripts/ralph-art-loop.sh`
   - Click **OK**

6. Click **OK** to save

Your art generation will now run automatically every 6 hours!

## Troubleshooting

### Artworks not generating

1. Check **Actions** tab for errors
2. Verify API key (if using AI)
3. Check workflow logs

### GitHub Pages not updating

1. Clear browser cache
2. Check Pages settings
3. Ensure workflows completed successfully

### WSL task not running

1. Check Windows Task Scheduler logs
2. Verify script permissions: `ls -l scripts/ralph-art-loop.sh`
3. Test manually: `wsl bash scripts/ralph-art-loop.sh`

## Next Steps

- Customize prompts in `prompts/art-generation.txt`
- Add new art techniques in `scripts/art-generator.js`
- Modify gallery styling in `styles/gallery.css`
- Adjust generation frequency in `.github/workflows/autonomous-generate.yml`

---

**Enjoy exploring the latent space of generative art!**
