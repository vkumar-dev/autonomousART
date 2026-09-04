# Model Management & Inference Architecture

autonomousART adopts the **autonomousMATH** inference architecture, removing Ollama and third-party API dependencies entirely.

## Zero Ollama / Pure Hugging Face GGUF

1. **Automated Discovery (`scripts/model_resolver.py`)**:
   - Queries the Hugging Face Hub using the `hf` CLI for public, non-gated models.
   - Requires no Hugging Face token or authentication.
   - Filters models suitable for runner memory and CPU speed (3B–7B parameter range, file size ≤ 4.8 GB, Q4/Q5 quantization).
   - Ranks models with a composite scoring function across task keywords, popularity, packager reputation, recency, and size.
   - Writes `selected-model.json`.

2. **Local GGUF Inference (`scripts/hf_inference.py`)**:
   - Reads `selected-model.json` and downloads the GGUF weights via `huggingface_hub.hf_hub_download` (tokenless).
   - Executes generation locally via `llama-cpp-python` (with `llama-cli` fallback).
   - Runs purely inside standard GitHub Actions runners with no external server or API keys required.

3. **Concept Generation (`scripts/concept-generator.js`)**:
   - Prompts the selected GGUF model for surreal, experimental art concepts with algorithmic diversity.
   - Emits structured JSON to `selected-concept.json` for consumption by `scripts/art-generator.js`.
