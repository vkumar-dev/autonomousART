# autonomousART

🎨 Autonomous generative art gallery powered by open Hugging Face GGUF models and GitHub Actions.

## How it Works
- **Model Discovery**: Queries Hugging Face Hub dynamically for open, non-gated GGUF models matching CPU compute limits.
- **Concept**: Once a day, local llama.cpp inference generates a unique, surreal art concept.
- **Generation**: A Canvas-based renderer creates the artwork (fractals, particles, cellular automata, noise).
- **Deployment**: Each piece is committed and auto-deployed to GitHub Pages.

## Core Components
- `scripts/model_resolver.py`: Automated open non-gated HF GGUF model discovery (from autonomousMATH architecture).
- `scripts/hf_inference.py`: Local llama.cpp inference runner without Ollama or API keys.
- `scripts/concept-generator.js`: Concept generation using the resolved GGUF model.
- `scripts/art-generator.js`: Main Canvas rendering engine.
- `scripts/build-gallery.js`: Builds the gallery catalog and index.

## Quick Start
1. Fork and clone this repo.
2. Enable GitHub Pages (GitHub Actions or root directory).
3. Enable GitHub Actions and run the **Generate Art** workflow.

## Documentation
- [MODELS.md](./MODELS.md): Model discovery and inference architecture.
- [artworks-list.json](./artworks-list.json): Full catalog of generated pieces.

## License
MIT
