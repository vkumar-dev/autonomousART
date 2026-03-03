# Model Updater Bot - Safe Rollover Strategy

## Problem

When multiple open-source models are released simultaneously, updating the config blindly without testing could break the entire workflow. We need a **staged verification** approach.

## Solution: Three-Stage Validation

### Stage 1: Search & Candidate Selection
```
Model Updater Bot (weekly schedule)
  ↓
Search HuggingFace for latest 4B open-weight models
  ↓
Create `models.staging.json` with candidates
  ↓
Status: "pending_test"
```

**File**: `models.staging.json`
```json
{
  "candidates": [
    {"rank": "primary", "name": "mistral-latest", "discovered": "..."},
    {"rank": "fallback", "name": "llama2-latest", "discovered": "..."}
  ],
  "status": "pending_test",
  "testResult": null
}
```

---

### Stage 2: Test Generation (CRITICAL)
```
For each candidate:
  ↓
Pull model from Ollama (if needed)
  ↓
Run test prompt: "You are a helpful assistant..."
  ↓
Verify output is:
  - Not empty (min 10 chars)
  - Coherent (not error message)
  - Generated successfully
  ↓
Record result
```

**Test Results Logged:**
```json
{
  "model": "mistral-latest",
  "tested": true,
  "success": true,
  "tokensUsed": 245
}
```

**If test fails**: Status → "failed", no config update
**If test passes**: Status → "verified", proceed to Stage 3

---

### Stage 3: Promotion & Deployment
```
All tests passed?
  ↓ YES
Update `models.config.json`:
  - primaryModel: new_primary
  - fallbackModel: new_fallback
  - lastVerified: timestamp
  ↓
Log update in `model-update-log.json`
  ↓
Commit & Push to repo
  ↓
Status: "promoted"
```

---

## Safety Mechanisms

### 1. Staged Config Files
- **Active**: `models.config.json` (used by inference)
- **Staging**: `models.staging.json` (test candidates only)
- **History**: `model-update-log.json` (audit trail)

### 2. Atomicity
- Models are only promoted after **all tests pass**
- Simultaneous releases are queued in staging
- If any test fails, entire update is rejected

### 3. Fallback Strategy
```javascript
// In ollama-inference.js
async selectBestModel() {
  const models = [config.primaryModel, config.fallbackModel];
  
  for (const modelName of models) {
    if (await modelExists(modelName)) {
      return modelName;  // Use first available
    }
  }
  
  return envFallback;  // Ultimate fallback
}
```

If primary model fails → automatic fallback to secondary
During execution, fallback is tracked in response: `usedFallback: true`

---

## GitHub Actions Workflow

### `model-updater.yml` (Weekly)

```yaml
jobs:
  check-and-test-models:
    
    steps:
      # Step 1: Search
      - run: node scripts/model-updater.js --search-only
        # Creates models.staging.json with candidates
      
      # Step 2: Pull & Test
      - run: ollama pull <candidate>
      - run: node scripts/model-updater.js --test-only
        # Tests all candidates, updates staging.testResult
      
      # Step 3: Check Results
      - run: |
          if staging.status === "failed":
            exit 1  # Cancel update
      
      # Step 4: Promote (only if tests passed)
      - run: node scripts/model-updater.js --promote
        # Moves staging candidates to active config
      
      # Step 5: Commit
      - run: git commit models.config.json
```

---

## Usage

### Manual Update (All Stages)
```bash
node scripts/model-updater.js
```

### Step-by-Step (for debugging)
```bash
# Search only
node scripts/model-updater.js --search-only

# Test only
node scripts/model-updater.js --test-only

# Promote only
node scripts/model-updater.js --promote
```

---

## Configuration Priority

When generating, models are selected in this order:

1. **Primary model** from `models.config.json` (latest verified)
2. **Fallback model** from `models.config.json` (secondary verified)
3. **Environment variable** `OLLAMA_MODEL` (default/override)

This ensures even if both config models are unavailable, we have a last-resort option.

---

## Update Audit Trail

Every promotion is logged in `model-update-log.json`:

```json
[
  {
    "timestamp": "2025-03-10T00:00:00Z",
    "previousPrimary": "mistral",
    "previousFallback": "llama2",
    "newPrimary": "mistral-latest",
    "newFallback": "llama3-latest",
    "testResults": [
      {"model": "mistral-latest", "success": true, "tokensUsed": 245}
    ],
    "status": "promoted"
  }
]
```

Track this file to understand model change history.

---

## Example Scenario: Simultaneous Releases

**Day 1, 00:00 UTC**: Weekly updater runs
- Finds: `mistral-0.3` and `llama3.1` released simultaneously
- Creates staging with both as candidates
- Tests both independently
- Both pass ✅
- Promotes both to active config

**Day 1, 06:00 UTC**: Art generation runs (using new models)
- Loads `models.config.json`
- Selects `mistral-0.3` as primary
- If it fails, falls back to `llama3.1`

**Day 8, 00:00 UTC**: Next weekly run (even newer models exist)
- Finds: `mistral-0.4` released
- Creates new staging
- `mistral-0.4` fails test (hypothetical)
- Status → "failed"
- Config unchanged → still using `mistral-0.3`
- Art generation unaffected

---

## Rollback

To manually revert to previous models:

```bash
# Check history
cat model-update-log.json

# Restore previous config
git checkout HEAD~1 models.config.json
git commit -m "🔄 Rollback models to previous version"
```

The fallback selection logic ensures generation continues even during rollback.

---

## Future Enhancements

- [ ] Performance metrics per model (speed, quality)
- [ ] Graduated rollout (test on 1% traffic first)
- [ ] Custom test prompts per use-case (concept, art generation)
- [ ] Model comparison metrics (output length, latency)
- [ ] Automatic rollback if error rate spikes during generation
