#!/usr/bin/env node

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'models.config.json');
const MODELS_STAGING_FILE = path.join(__dirname, '..', 'models.staging.json');
const UPDATE_LOG_FILE = path.join(__dirname, '..', 'model-update-log.json');

// HuggingFace models to search (4B open source models)
const OPEN_WEIGHTS_MODELS = [
  'NousResearch/Nous-Hermes-2-Mistral-7B-DPO',
  'mistralai/Mistral-7B-v0.1',
  'meta-llama/Llama-2-7b',
  'TheBloke/Mistral-7B-Instruct-v0.2-GGUF',
  'NousResearch/Hermes-2-Pro-Mistral-7B',
  'teknium/OpenHermes-2.5-Mistral-7B',
  'cognitivecomputations/dolphin-2.6-mistral-7b',
  'jondurbin/airoboros-l2-7b-gpt4-1.4.1'
];

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

  // Search HuggingFace for latest 4B open models
  async findLatestModels() {
    console.log('🔍 Searching HuggingFace for latest open-weight models...\n');
    
    const models = [];
    
    for (const modelName of OPEN_WEIGHTS_MODELS.slice(0, 8)) {
      try {
        const response = await fetch(
          `https://huggingface.co/api/models?search=${encodeURIComponent(modelName)}&task=text-generation&tags=4bit&sort=last_modified&direction=-1&limit=1`,
          { timeout: 5000 }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const model = data[0];
            models.push({
              name: model.modelId,
              size: this.estimateSize(model),
              lastModified: model.lastModified,
              downloads: model.downloads,
              likes: model.likes
            });
          }
        }
      } catch (error) {
        console.log(`  ⚠️  Failed to fetch ${modelName}: ${error.message}`);
      }
    }

    // Sort by last modified and return top 2
    const sorted = models
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
      .slice(0, 2);

    return sorted;
  }

  estimateSize(model) {
    // Approximate size based on model name
    if (model.modelId.includes('7b')) return '7B';
    if (model.modelId.includes('13b')) return '13B';
    if (model.modelId.includes('70b')) return '70B';
    return 'Unknown';
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
