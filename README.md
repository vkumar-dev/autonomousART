# autonomousART

🎨 An AI-powered autonomous art generator that creates unique, thought-provoking visualizations every 6 hours via GitHub Actions.

## Features

- **🤖 Autonomous Generation**: Creates new art pieces every 6 hours via GitHub Actions
- **🎭 Diverse Art Styles**: Multiple generative art techniques (fractals, particle systems, noise, geometric patterns)
- **💭 AI-Driven Concepts**: Each piece is conceptually guided by AI prompts
- **📄 GitHub Pages**: Auto-deploys to GitHub Pages

## How It Works

```
GitHub Actions (Every 6 Hours)
    ↓
Generate Art Concept (AI-guided)
    ↓
Create HTML/JS Visualization
    ↓
Commit & Push to Repository
    ↓
Deploy to GitHub Pages
```

## Quick Start

### 1. Create Repository

```bash
git clone https://github.com/<username>/autonomousART.git
cd autonomousART
```

### 2. Configure GitHub Pages

1. Go to **Settings** → **Pages**
2. Select: branch `main`, folder `/ (root)`
3. Click **Save**

### 3. Enable Workflows

1. Go to **Actions** tab
2. Enable workflows if prompted

### 4. Push and Deploy

```bash
git add .
git commit -m "Initial autonomousART setup"
git push -u origin main
```

Your gallery will be live at: `https://yourusername.github.io/autonomousART/`

## Development

### Local Testing

```bash
# Generate a test artwork
node scripts/concept-selector.js
node scripts/art-generator.js

# Build gallery
node scripts/build-gallery.js
```

### Serve Locally

```bash
python3 -m http.server 8000
```

Visit: `http://localhost:8000`

## Customization

### Modify Generation Frequency

Edit `.github/workflows/autonomous-generate.yml`:

```yaml
schedule:
  - cron: '0 */6 * * *'  # Change this
```

## License

MIT License

---

**Exploring creative code in the latent space of generative art**
