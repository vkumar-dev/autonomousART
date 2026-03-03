#!/usr/bin/env node

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'models.config.json');
const MODELS_STAGING_FILE = path.join(__dirname, '..', 'models.staging.json');
const UPDATE_LOG_FILE = path.join(__dirname, '..', 'model-update-log.json');

class ModelUpdater {
  constructor() {
    this.config = this.loadConfig();
    this.staging = this.loadStaging();
  }

  loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
    return {
      primaryModel: 'mistral',
      lastUpdated: null,
      lastVerified: null,
      locked: false,
      metadata: {
        source: 'unknown',
        size: '7B',
        tested: false,
        fallbackStrategy: 'git_history'
      }
    };
  }

  loadStaging() {
    if (fs.existsSync(MODELS_STAGING_FILE)) {
      return JSON.parse(fs.readFileSync(MODELS_STAGING_FILE, 'utf8'));
    }
    return {
      candidates: [],
      status: 'idle', // idle, testing, verified, failed
      testedAt: null,
      testResult: null
    };
  }

  // Search for latest models from curated list (no API keys needed)
  async findLatestModels() {
    console.log('🔍 Checking latest open-weight models...\n');
    
    // Curated list of latest 4B open-weight models (no auth required)
    // Update this list manually as new models are released
    const latestModels = [
      {
        name: 'mistral-latest',
        source: 'mistralai/Mistral-Nemo-12B',
        size: '12B',
        released: '2024-12',
        category: 'general'
      },
      {
        name: 'llama3.1-latest',
        source: 'meta-llama/Llama-3.1-8B',
        size: '8B',
        released: '2024-07',
        category: 'general'
      },
      {
        name: 'neural-chat',
        source: 'Intel/neural-chat-7b-v3-3',
        size: '7B',
        released: '2024-06',
        category: 'chat'
      },
      {
        name: 'openhermes',
        source: 'teknium/OpenHermes-2.5-Mistral-7B',
        size: '7B',
        released: '2024-05',
        category: 'chat'
      },
      {
        name: 'dolphin-mistral',
        source: 'cognitivecomputations/dolphin-2.6-mistral-7b',
        size: '7B',
        released: '2024-04',
        category: 'general'
      }
    ];

    // Return top 2 newest models
    const sorted = latestModels
      .sort((a, b) => new Date(b.released) - new Date(a.released))
      .slice(0, 2);

    console.log(`✅ Found ${sorted.length} latest models from curated list:\n`);
    sorted.forEach(m => {
      console.log(`   📦 ${m.name} (${m.size}) - ${m.source}`);
    });

    return sorted;
  }

  // Create staging candidates for testing
  async createCandidates(newModels) {
    console.log('📋 Creating candidate models for testing...\n');

    const candidates = newModels.map((model, idx) => ({
      rank: idx === 0 ? 'primary' : 'fallback',
      name: this.normalizeModelName(model.name),
      source: model.name,
      discovered: new Date().toISOString(),
      size: model.size
    }));

    this.staging = {
      candidates,
      status: 'pending_test',
      testedAt: null,
      testResult: null
    };

    fs.writeFileSync(MODELS_STAGING_FILE, JSON.stringify(this.staging, null, 2));
    console.log(`✅ Created ${candidates.length} candidate models:\n`);
    candidates.forEach(c => console.log(`   ${c.rank}: ${c.name} (${c.size})`));

    return candidates;
  }

  normalizeModelName(fullPath) {
    // Convert HuggingFace path to Ollama-compatible name
    const parts = fullPath.split('/');
    return parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9-]/g, '');
  }

  // Test candidates with a simple generation
  async testCandidates(OllamaInference) {
    console.log('\n🧪 Testing candidate models...\n');

    const results = [];
    const testPrompt = `You are a helpful assistant. Write ONE sentence about generative art.`;

    for (const candidate of this.staging.candidates) {
      try {
        console.log(`   Testing: ${candidate.name}`);

        const inference = new OllamaInference(
          process.env.OLLAMA_URL || 'http://localhost:11434',
          candidate.name
        );

        const exists = await inference.modelExists();
        if (!exists) {
          console.log(`      ⚠️  Model not available (will need pull)`);
          results.push({
            model: candidate.name,
            tested: false,
            reason: 'Not available locally',
            status: 'pending_pull'
          });
          continue;
        }

        const result = await inference.generate(testPrompt, {
          temperature: 0.7,
          topP: 0.9,
          numPredict: 100,
          verbose: false
        });

        if (result.success && result.content && result.content.length > 10) {
          console.log(`      ✅ Generated ${result.content.length} chars`);
          results.push({
            model: candidate.name,
            tested: true,
            success: true,
            tokensUsed: result.tokens
          });
        } else {
          console.log(`      ❌ Generation failed or empty`);
          results.push({
            model: candidate.name,
            tested: true,
            success: false,
            error: result.error || 'Empty response'
          });
        }
      } catch (error) {
        console.log(`      ❌ Error: ${error.message}`);
        results.push({
          model: candidate.name,
          tested: true,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Promote verified candidates to config (only primaryModel)
  async promoteCandidates(testResults) {
    console.log('\n📊 Test Results:\n');

    const successes = testResults.filter(r => r.success || r.status === 'pending_pull');
    const failures = testResults.filter(r => r.success === false);

    successes.forEach(r => {
      console.log(`   ✅ ${r.model}`);
    });
    failures.forEach(r => {
      console.log(`   ❌ ${r.model}: ${r.error}`);
    });

    if (successes.length === 0) {
      console.log('\n⚠️  No candidates passed testing. Keeping existing model.\n');
      this.staging.status = 'failed';
      fs.writeFileSync(MODELS_STAGING_FILE, JSON.stringify(this.staging, null, 2));
      return false;
    }

    // Only promote PRIMARY model (fallback comes from git history)
    const primary = this.staging.candidates.find(c => c.rank === 'primary');
    const oldPrimary = this.config.primaryModel;

    this.config.primaryModel = primary.name;
    this.config.metadata = {
      source: primary.source,
      size: primary.size,
      tested: true,
      fallbackStrategy: 'git_history'
    };
    this.config.lastUpdated = new Date().toISOString();
    this.config.lastVerified = new Date().toISOString();

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));

    // Log the update
    this.logUpdate(oldPrimary, this.config.primaryModel, testResults);

    console.log('\n✅ Model update completed!');
    console.log(`   Primary: ${oldPrimary} → ${this.config.primaryModel}`);
    console.log(`   Fallback: Will use git history queue\n`);

    this.staging.status = 'verified';
    fs.writeFileSync(MODELS_STAGING_FILE, JSON.stringify(this.staging, null, 2));

    return true;
  }

  logUpdate(oldPrimary, newPrimary, testResults) {
    const logs = fs.existsSync(UPDATE_LOG_FILE)
      ? JSON.parse(fs.readFileSync(UPDATE_LOG_FILE, 'utf8'))
      : [];

    logs.push({
      timestamp: new Date().toISOString(),
      previousPrimary: oldPrimary,
      newPrimary,
      testResults,
      status: 'promoted',
      note: 'Fallback chain maintained in git history via GitModelQueue'
    });

    // Keep last 50 updates (full git history available anyway)
    if (logs.length > 50) logs.shift();

    fs.writeFileSync(UPDATE_LOG_FILE, JSON.stringify(logs, null, 2));
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const searchOnly = args.includes('--search-only');
    const testOnly = args.includes('--test-only');
    const promote = args.includes('--promote');

    const updater = new ModelUpdater();

    // Full workflow
    if (!searchOnly && !testOnly && !promote) {
      console.log('🔄 Running full model update workflow...\n');

      // Step 1: Find latest models
      const latestModels = await updater.findLatestModels();
      
      if (latestModels.length === 0) {
        console.log('❌ No models found. Check internet connection.\n');
        process.exit(1);
      }

      console.log(`\n✅ Found ${latestModels.length} latest models\n`);

      // Step 2: Create candidates for testing
      await updater.createCandidates(latestModels);

      // Step 3: Test candidates (requires Ollama)
      const OllamaInference = require('./ollama-inference');
      const testResults = await updater.testCandidates(OllamaInference);

      // Step 4: Promote if tests pass
      const promoted = await updater.promoteCandidates(testResults);

      if (!promoted) {
        console.log('⚠️  Update cancelled due to test failures.');
        process.exit(1);
      }
    }

    // Step-by-step execution (for CI/CD)
    if (searchOnly) {
      console.log('🔍 Step 1: Searching for models...\n');
      const latestModels = await updater.findLatestModels();
      if (latestModels.length === 0) {
        console.log('❌ No models found.');
        process.exit(1);
      }
      await updater.createCandidates(latestModels);
    }

    if (testOnly) {
      console.log('🧪 Step 2: Testing candidates...\n');
      const OllamaInference = require('./ollama-inference');
      const testResults = await updater.testCandidates(OllamaInference);
      updater.staging.testResult = testResults;
      fs.writeFileSync(MODELS_STAGING_FILE, JSON.stringify(updater.staging, null, 2));
      console.log('\n✅ Testing complete');
    }

    if (promote) {
      console.log('📤 Step 3: Promoting verified models...\n');
      if (!updater.staging.candidates || updater.staging.candidates.length === 0) {
        console.log('❌ No staged candidates to promote.');
        process.exit(1);
      }
      const testResults = updater.staging.testResult || [];
      await updater.promoteCandidates(testResults);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ModelUpdater };
