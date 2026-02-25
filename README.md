# autonomousART

🎨 An AI-powered autonomous art generator that creates unique, thought-provoking visualizations and generative art pieces every 6 hours.

Exploring the latent space of creative code through AI-guided generative algorithms.

## Features

- **🤖 Autonomous Generation**: Creates new art pieces every 6 hours via GitHub Actions
- **🎭 Diverse Art Styles**: Multiple generative art techniques (fractals, particle systems, noise, geometric patterns, interactive visualizations)
- **🌈 Rich Visual Language**: Canvas, SVG, WebGL-based art with color theory exploration
- **💭 AI-Driven Concepts**: Each piece is conceptually guided by AI prompts
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🔄 No Duplicates**: Tracks previously generated concepts to explore new latent spaces
- **📄 GitHub Pages**: Auto-deploys to GitHub Pages

## How It Works

### Art Generation Flow

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
    ↓
Display on autonomousART Gallery
```

### Art Techniques

1. **Fractal Geometry** - Mandelbrot/Julia set variations
2. **Particle Systems** - Emergent behavior simulations
3. **Perlin Noise** - Organic flowing forms
4. **Generative Patterns** - Algorithmic tile systems
5. **Interactive Physics** - Real-time particle dynamics
6. **Color Gradients** - Algorithmic color theory
7. **Symmetry Operations** - Kaleidoscopic patterns
8. **Mesh Deformation** - Geometric transformations
9. **Cellular Automata** - Conway's Game of Life variations
10. **Vector Fields** - Flow visualization

## Project Structure

```
autonomousART/
├── .github/
│   └── workflows/
│       ├── autonomous-generate.yml  # Runs every 6 hours
│       └── deploy.yml               # Deploys to GitHub Pages
├── artworks/                        # Generated art pieces
├── prompts/
│   └── art-generation.txt           # Art concept prompts
├── scripts/
│   ├── art-generator.js             # Main art generator
│   ├── concept-selector.js          # Selects next concept
│   ├── build-gallery.js             # Builds gallery index
│   ├── build-concept-history.js     # Tracks concepts
│   └── homepage.js                  # Gallery functionality
├── styles/
│   ├── gallery.css                  # Gallery layout
│   ├── artwork.css                  # Individual artwork
│   └── theme.css                    # Dark mode theme
├── templates/
│   └── artwork-template.html        # HTML template for artworks
├── index.html                       # Gallery homepage
└── SETUP.md                         # Setup instructions
```

## Quick Start

### 1. Create Repository

```bash
git clone <your-fork>
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

## Art Concepts

Art is generated based on conceptual prompts:

- "Recursive spirals with golden ratio"
- "Particles attracted to invisible forces"
- "Organic growth pattern simulation"
- "Chromatic aberration flowing landscape"
- "Symmetry breaking cascade"
- "Cellular automata emergent structures"

Each concept is translated into generative code that produces unique visualizations.

## Customization

### Create Custom Art Templates

Edit `templates/artwork-template.html` or create new templates in `templates/` directory.

### Modify Generation Frequency

Edit `.github/workflows/autonomous-generate.yml`:

```yaml
schedule:
  - cron: '0 */6 * * *'  # Change this
```

### Add Custom Art Techniques

Create new files in `scripts/techniques/` and import them in the generator.

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

## API Integration

Generate concepts with AI:

```bash
GEMINI_API_KEY=your-key node scripts/art-generator.js
```

Or use without API (fallback mode generates random concepts).

## Troubleshooting

### Artworks not generating

1. Check **Actions** tab for workflow errors
2. Verify API keys are set (if using AI)
3. Check workflow logs for specific errors

### GitHub Pages not updating

1. Ensure deploy workflow completed
2. Clear browser cache
3. Check Settings → Pages configuration

## License

MIT License

---

**Exploring creative code in the latent space of generative art**

Made with ❤️ by autonomousART
