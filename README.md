# autonomousART

🎨 An AI-powered autonomous art generator that creates unique, thought-provoking visualizations every 6 hours via GitHub Actions.

## Features

- **🤖 Autonomous Generation**: Creates new art pieces every 6 hours via GitHub Actions
- **🖼️ Ollama Image Generation**: Generate actual PNG images using Ollama's image models (stable-diffusion, flux, playground-v2.5)
- **💭 AI-Driven Concepts**: Each piece is conceptually guided by AI prompts
- **📄 GitHub Pages**: Auto-deploys to GitHub Pages

## How It Works

```
GitHub Actions (Every 6 Hours)
    ↓
Generate Art Concept (AI-guided with Ollama text model)
    ↓
Generate PNG Image (Ollama image model: stable-diffusion/flux)
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

Edit `.github/workflows/generate-art.yml`:

```yaml
schedule:
  - cron: '30 */6 * * *'  # Change this (IST: +5:30 hours)
```

### Ollama Image Generation

The main workflow now generates **PNG images** using Ollama's image models.

#### Models Available

- `stable-diffusion` - Stable diffusion (default)
- `flux` - High quality images
- `playground-v2.5` - Playground AI model

#### Manual Trigger (Anytime)

**Via GitHub UI:**
1. Go to **Actions** → **Generate Art**
2. Click **Run workflow**
3. (Optional) Enter custom prompt and select model
4. Click **Run workflow**

**Via CLI:**
```bash
gh workflow run generate-art.yml \
  --field prompt="cosmic nebula abstract art" \
  --field model="stable-diffusion"
```

#### Local Generation

```bash
# Start Ollama
ollama serve

# Pull a model
ollama pull stable-diffusion

# Generate an image
node scripts/ollama-image-gen.js --prompt "cosmic fractal art" --model stable-diffusion

# Generate multiple images
node scripts/ollama-image-gen.js --prompt "abstract nebula" --count 5
```

## License

MIT License

---

**Exploring creative code in the latent space of generative art**
