# autonomousART

🎨 Autonomous generative art gallery powered by AI and GitHub Actions.

## How it Works
- **Concept**: Every 6 hours, Ollama (tinyllama) generates a unique art concept.
- **Generation**: A Canvas-based renderer creates the artwork (fractals, particles, noise).
- **Deployment**: Each piece is committed and auto-deployed to GitHub Pages.

## Core Components
- `scripts/art-generator.js`: Main rendering engine.
- `scripts/ollama-concept-generator.js`: Concept generation via JSON mode.
- `scripts/model-updater.js`: Automatic model selection and fallback.

## Quick Start
1. Fork and clone this repo.
2. Enable GitHub Pages (root directory).
3. Enable GitHub Actions.

## Local Test
```bash
npm install
node scripts/ollama-concept-generator.js
node scripts/art-generator.js
```

## Documentation
- [MODELS.md](./MODELS.md): Model management and fallback strategy.
- [artworks-list.json](./artworks-list.json): Full catalog of generated pieces.

## License
MIT
