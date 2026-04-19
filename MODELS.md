# Model Management & Fallback Strategy

## Dynamic Model Selection
The system uses `models.config.json` to define the primary model. If the primary model is unavailable (e.g., during a rollout or infrastructure failure), the system automatically falls back through previous versions stored in git history.

## Git-Backed Fallback Queue
Instead of maintaining a manual list of fallback models, we use the repository's own history:
1. **Primary Model**: Defined in `models.config.json`.
2. **Git Queue**: If primary fails, `GitModelQueue` scans the last 20-50 commits to find previously working models.
3. **Environment Fallback**: Ultimate fallback to `OLLAMA_MODEL` environment variable.

## Automatic Model Updates
`scripts/model-updater.js` runs via GitHub Actions (`model-updater.yml`) to:
- Discover new or improved models.
- Perform A/B testing on candidate models.
- Update `models.config.json` when a better model is verified.
- Track performance in `model-update-log.json`.

## Configuration Schema
```json
{
  "primaryModel": "qwen3.5:3b",
  "fallbackModel": "llama3.2:3b",
  "fallbackStrategy": "git_history"
}
```
