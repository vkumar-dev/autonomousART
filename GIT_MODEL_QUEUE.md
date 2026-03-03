# Git-Backed Model Fallback Queue

## Problem

Previously: Keep primary + 1 fallback in config. If both fail = broken.

Now: Keep only **1 active model**. If it fails, check **git history** for previous models. Fallback chain is **infinite**.

## How It Works

### 1. Single Active Model
```json
{
  "primaryModel": "mistral-0.3",
  "lastUpdated": "2025-03-10T00:00:00Z",
  "metadata": {
    "fallbackStrategy": "git_history"
  }
}
```

Only ONE model is active in `models.config.json`.

### 2. Git History = Fallback Queue
Every time `models.config.json` is committed with a new model:
```
Week 1: mistral-0.2 → commit
Week 2: mistral-0.3 → commit
Week 3: llama2-v1 → commit
Week 4: llama3.1 → commit (CURRENT)
```

Git history = fallback chain:
1. llama3.1 (current)
2. llama2-v1 (1 commit back)
3. mistral-0.3 (2 commits back)
4. mistral-0.2 (3 commits back)
...infinitely back

### 3. Runtime Fallback Flow
```
Art generation starts
  ↓
Load models.config.json
  ↓
Try primaryModel: llama3.1
  ↓
  Is it available?
    ↓ YES → Use it
    ↓ NO → selectFromGitHistory()
  ↓
For each model in git history (newest first):
  Try to use it
    ↓ Available → Use it, log it, continue
    ↓ Not available → Try next
  ↓
If ALL fail → Use env var fallback
```

## Usage

### View Fallback Queue
```bash
node scripts/git-model-queue.js --show
```

Output:
```
📋 Model Fallback Queue:

  1. llama3.1
     Source: current
     Time: 2025-03-10T00:00:00Z

  2. llama2-v1
     Source: git:a3f4d2c
     Time: 2025-03-03T00:00:00Z
     Commit: 🤖 [AUTO] Update models: 2025-03-03

  3. mistral-0.3
     Source: git:b1e5c9a
     Time: 2025-02-24T00:00:00Z

  4. mistral-0.2
     Source: git:f8d2a1c
     Time: 2025-02-17T00:00:00Z

Total: 4 models available
```

### Get Next Fallback After Model
```bash
node scripts/git-model-queue.js --next llama3.1
```

Output:
```
Next fallback after "llama3.1": llama2-v1
```

### Statistics
```bash
node scripts/git-model-queue.js --stats
```

Output:
```
📊 Model Statistics:

  Unique models: 4
  Total updates: 4
  Transitions: 3
  Current model: llama3.1
  Queue depth: 4
```

## Architecture

### GitModelQueue Class
```javascript
class GitModelQueue {
  getModelHistory(limit = 50)     // Get all model changes from git
  getFallbackQueue(limit = 20)    // Get ordered fallback chain
  getNextFallback(model)          // Get next model after given one
  getModelAtIndex(index)          // Get specific position in queue
  getStats()                      // Statistics on model changes
}
```

### OllamaInference Integration
```javascript
async selectBestModel() {
  // Try current primary
  if (await modelExists(primaryModel)) {
    return primaryModel;
  }
  
  // Try git history queue
  return await selectFromGitHistory();
}

async selectFromGitHistory() {
  const queue = new GitModelQueue();
  const fallbackQueue = queue.getFallbackQueue();
  
  for (const entry of fallbackQueue) {
    if (await modelExists(entry.model)) {
      console.log(`Using: ${entry.model} (source: ${entry.source})`);
      return entry.model;
    }
  }
  
  return null;  // All failed
}
```

## Sequence Diagram

```
Week 1: mistral-0.2 deployed
  ↓
  models.config.json committed
  ↓
  git history: [mistral-0.2]

Week 2: Update to mistral-0.3
  ↓
  Test: ✅ Pass
  ↓
  Update models.config.json: primaryModel = mistral-0.3
  ↓
  Commit to repo
  ↓
  git history: [mistral-0.3, mistral-0.2]

Week 3: During art generation
  ↓
  Load primaryModel: mistral-0.3
  ↓
  Check Ollama: ❌ Not available
  ↓
  selectFromGitHistory()
  ↓
  Queue: [mistral-0.3, mistral-0.2]
  ↓
  Try mistral-0.3: ❌ No
  ↓
  Try mistral-0.2: ✅ Yes
  ↓
  Use mistral-0.2, log fallback usage
  ↓
  Continue generation
```

## Benefits

### 1. Infinite Fallback Chain
- No limit on how far back you can go
- Historical models remain accessible forever
- Git history is immutable

### 2. Minimal Config File
- Only store 1 active model
- Reduce config complexity
- Easier to understand at a glance

### 3. Audit Trail Built-in
- Every model change is a git commit
- `git log --follow models.config.json` shows full history
- Timestamps, authors, commit messages included

### 4. No Dual Storage
- Don't maintain separate fallback list
- Don't duplicate data between config and git
- Single source of truth: git history

### 5. Graceful Degradation
```
Primary fails (week 4 model)
  → Try week 3 model
    → Try week 2 model
      → Try week 1 model
        → Try env var fallback
```

## Performance Considerations

### Git History Lookup
- First call: Parse git history (cache in memory)
- Subsequent calls: Use cached queue
- ~50 commits = ~100ms lookup time

### Optimization
```javascript
// Cache git queue in OllamaInference instance
this.modelQueue = null;

async selectFromGitHistory() {
  if (!this.modelQueue) {
    this.modelQueue = new GitModelQueue();
  }
  const queue = this.modelQueue.getFallbackQueue();
  // ...
}
```

## Migration from Old Config

### Old Format
```json
{
  "primaryModel": "mistral",
  "fallbackModel": "llama2",
  "models": [...]
}
```

### New Format
```json
{
  "primaryModel": "mistral",
  "metadata": {
    "fallbackStrategy": "git_history"
  }
}
```

### Steps
1. Remove `fallbackModel` field
2. Remove `models` array
3. Keep only `primaryModel`
4. Add `metadata.fallbackStrategy = "git_history"`
5. Commit change
6. Update OllamaInference to use GitModelQueue
7. Models from old config still accessible via git history

## Example Scenario

### Timeline
```
2025-02-15: Deploy with mistral
2025-02-22: Update to llama2-v1
2025-03-01: Update to llama3
2025-03-08: Update to llama3.1
```

### Git History
```
commit abc123 (2025-03-08)
  primaryModel: llama3.1

commit def456 (2025-03-01)
  primaryModel: llama3

commit ghi789 (2025-02-22)
  primaryModel: llama2-v1

commit jkl012 (2025-02-15)
  primaryModel: mistral
```

### Art Generation on 2025-03-10
```
Try llama3.1 (current):   ❌ Not available
Try llama3 (3-08):        ✅ Available → Use this
```

### If Even llama3 Fails
```
Try llama3.1 (current):     ❌ Not available
Try llama3 (3-08):          ❌ Not available
Try llama2-v1 (3-01):       ✅ Available → Use this
```

### If All Fail
```
Try llama3.1:     ❌
Try llama3:       ❌
Try llama2-v1:    ❌
Try mistral:      ❌
Use env var:      ✅ qwen2.5-coder:7b
```

## Warnings & Limitations

### ⚠️ Requires Git Repository
- Must have `.git` directory
- Must have commit history with models.config.json
- Won't work on fresh repos (first deployment)

### ⚠️ Git History Cleanup
- `git gc` or force push might affect history
- Use `git reflog` if history is lost
- Recommended: Never force push models.config.json

### ⚠️ Model Availability
- Models must be available on Ollama
- Older models might be deprecated
- Maintain at least 1 recent model in Ollama registry

## Maintenance

### Regular Cleanup
```bash
# View oldest models still in history
git log --oneline --follow models.config.json | tail -10

# Remove obsolete entries (if needed, but recommended to keep all)
git log --follow models.config.json | grep "Model:"
```

### Best Practices
1. Always test before promoting to primaryModel
2. Keep Ollama updated with model versions you might need
3. Monitor `model-update-log.json` for fallback usage
4. Review model-updater.yml logs weekly

---

This design turns git into a **distributed, immutable model registry** where every historical model is one checkout away.
