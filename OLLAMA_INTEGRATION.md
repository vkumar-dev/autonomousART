# Ollama Integration for autonomousART

## Overview

autonomousART now supports **Ollama-based concept generation** similar to the autonomousBLOG implementation. This allows the project to generate unique art concepts using local LLM inference instead of relying on external APIs.

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Art Generation Pipeline                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. Concept Selector                            │
│     ├─ ollama-concept-generator.js ✨ NEW       │
│     ├─ concept-selector.js (existing)           │
│     └─ Fallback mechanisms                      │
│                                                  │
│  2. Concept File                                │
│     └─ selected-concept.json                    │
│                                                  │
│  3. Art Generator                               │
│     └─ art-generator.js (existing)              │
│        Converts concept → HTML/Canvas art       │
│                                                  │
│  4. Output                                      │
│     └─ artworks/*.html (procedural art)         │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Implementation Details

### OllamaConceptGenerator Class

**File**: `scripts/ollama-concept-generator.js`

Features:
- Connects to local Ollama instance at `http://localhost:11434` (configurable via `OLLAMA_URL` env var)
- Uses configurable model (default: `qwen2.5-coder:7b`, configurable via `OLLAMA_MODEL` env var)
- 10-minute timeout for generation (suitable for slower inference)
- Structured prompt generation with art-specific parameters
- Intelligent response parsing to extract:
  - Title
  - Concept description
  - Art technique
  - Color palette (hex codes)
  - Emotional tone
  - Interaction type

### Model Selection Research (for code-driven mathematical art)

Default model is now **`qwen2.5-coder:7b`** instead of tiny/general small models because:

- It is open-weight and available in Ollama.
- It is tuned for code synthesis, which helps produce structured algorithmic prompts that map better to Canvas/JS generation.
- It is generally stronger at math + reasoning heavy tasks than tiny baseline models, improving consistency for fractals, particle systems, and geometry-driven concepts.
- It still runs locally on commodity hardware compared with larger reasoning models.

If your machine can support bigger models, you can still override with `OLLAMA_MODEL`.

### Generation Process

1. **Load Prompt**: Reads from `prompts/art-generation.txt` or uses default
2. **Random Parameters**: Selects random technique and tone
3. **Ollama Call**: Generates concept with:
   - Temperature: 0.8 (creative but coherent)
   - Token prediction: 1500 (sufficient for detailed concepts)
   - No streaming (simpler to handle)
4. **Parse Response**: Extracts structured data from text
5. **Save Concept**: Writes `selected-concept.json` for `art-generator.js`
6. **Update History**: Tracks all generated concepts

## Usage

### Option 1: Direct Ollama Generation

```bash
cd autonomousART
export OLLAMA_URL="http://localhost:11434"
export OLLAMA_MODEL="qwen2.5-coder:7b"
node scripts/ollama-concept-generator.js
```

### Option 2: Via Existing Concept Selector

Update `concept-selector.js` to call Ollama first, then fallback to Gemini API or existing fallbacks.

### Option 3: GitHub Actions Workflow

```yaml
- name: Generate art with Ollama
  env:
    OLLAMA_URL: http://localhost:11434
    OLLAMA_MODEL: qwen2.5-coder:7b
  run: |
    node scripts/ollama-concept-generator.js
    node scripts/art-generator.js
    node scripts/build-gallery.js
```

## Features

✅ **Local Inference**: No API keys required, runs on your machine  
✅ **Structured Output**: Parses LLM response into usable art concepts  
✅ **Fallback Support**: Random concept if Ollama unavailable  
✅ **History Tracking**: Maintains record of all generated concepts  
✅ **Configurable**: Environment variables for URL, model, timeout  
✅ **Timeout Protection**: 10-minute timeout prevents hanging  
✅ **Logging**: Detailed console output for debugging  

## Generated Concept Structure

```json
{
  "title": "Luminous Fractals",
  "concept": "Infinite zooming into fractal patterns with morphing colors and shapes",
  "technique": "Fractal Mathematics",
  "colors": ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
  "interaction": "Animated",
  "tone": "Mind-bending complexity",
  "generated": "ollama"
}
```

## Environment Variables

- `OLLAMA_URL`: Ollama server URL (default: `http://localhost:11434`)
- `OLLAMA_MODEL`: Model to use (default: `qwen2.5-coder:7b`)

## Comparison: autonomousBLOG vs autonomousART

| Aspect | autonomousBLOG | autonomousART |
|--------|---|---|
| **Inference Type** | Text generation (articles) | Concept generation |
| **Output** | Markdown files | JSON concept + HTML/Canvas art |
| **Model** | Mistral | Qwen2.5-Coder 7B |
| **Timeout** | 10 minutes | 10 minutes |
| **Tokens** | 1024 | 1500 |
| **Temperature** | 0.7 | 0.8 (more creative) |
| **File Structure** | yyyy/mm/dd/timestamp_slug.md | yyyy-mm-dd-hhmms-slug.html |

## Integration Path

1. ✅ Created `ollama-concept-generator.js` with OllamaConceptGenerator class
2. Next: Integrate into GitHub Actions workflow
3. Next: Add fallback logic to `concept-selector.js`
4. Next: Test with different Ollama models
5. Next: Optimize prompts for art concept generation

## Testing

```bash
# Start Ollama
ollama serve

# Pull model (if not already present)
ollama pull qwen2.5-coder:7b

# Generate a concept
cd autonomousART
node scripts/ollama-concept-generator.js

# Generate artwork from concept
node scripts/art-generator.js

# View artwork
open artworks/latest.html
```

## Troubleshooting

- **"Ollama service is not available"**: Make sure `ollama serve` is running
- **Long generation times**: Normal for CPU inference, use `-O` flag with faster models
- **Empty responses**: Increase `numPredict` or check Ollama logs
- **Parse failures**: Fallback uses random technique/tone, check response format

## Future Enhancements

- Support image generation with Stable Diffusion via Ollama
- Stream responses for progress feedback
- Cache commonly generated concepts
- Multi-model support (Llama, Neural Chat, etc.)
- Sentiment-based concept generation (like autonomousBLOG)
- Integration with external stable diffusion for photorealistic art
