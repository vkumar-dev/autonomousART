#!/usr/bin/env node

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';
const CONFIG_FILE = path.join(__dirname, '..', 'models.config.json');

class OllamaInference {
  constructor(url = OLLAMA_URL, model = OLLAMA_MODEL) {
    this.url = url;
    this.model = model;
    this.timeout = 600000;
    this.selectedModel = null;
    this.fallbackUsed = false;
  }

  // Load model config and select best available
  loadModelConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      }
    } catch (error) {
      console.warn('⚠️  Could not load model config:', error.message);
    }
    return null;
  }

  // Select model: use config primary, then git history queue
  async selectBestModel() {
    const config = this.loadModelConfig();
    
    if (config && config.primaryModel && !this.model.includes(':')) {
      // Try primary first
      const primaryInference = new OllamaInference(this.url, config.primaryModel);
      if (await primaryInference.modelExists()) {
        this.selectedModel = config.primaryModel;
        return config.primaryModel;
      }

      // Primary failed, try git history queue
      console.log(`⚠️  Primary model "${config.primaryModel}" unavailable, checking git history...`);
      return await this.selectFromGitHistory();
    }
    
    // Fallback to env-specified model
    this.selectedModel = this.model;
    return this.model;
  }

  // Get fallback from git history queue
  async selectFromGitHistory() {
    try {
      const { GitModelQueue } = require('./git-model-queue');
      const queue = new GitModelQueue();
      const fallbackQueue = queue.getFallbackQueue();

      console.log(`\n🔄 Trying ${fallbackQueue.length} models from git history queue:\n`);

      for (const entry of fallbackQueue) {
        const inference = new OllamaInference(this.url, entry.model);
        
        try {
          if (await inference.modelExists()) {
            this.selectedModel = entry.model;
            this.fallbackUsed = true;
            console.log(`✅ Using model from git history: ${entry.model}`);
            console.log(`   Source: ${entry.source}`);
            console.log(`   Timestamp: ${entry.timestamp}\n`);
            return entry.model;
          }
        } catch (error) {
          console.log(`  ⏭️  ${entry.model}: not available`);
        }
      }

      console.log(`\n❌ No models available in git history queue`);
      return null;
    } catch (error) {
      console.error(`❌ Git history lookup failed: ${error.message}`);
      return null;
    }
  }

  async isAvailable(retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${this.url}/api/tags`, { timeout: 5000 });
        if (response.ok) return true;
      } catch (error) {
        if (attempt < retries) {
          console.log(`  Retry ${attempt}/${retries}: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
      }
    }
    return false;
  }

  async generate(prompt, options = {}) {
    const {
      temperature = 0.7,
      topP = 0.9,
      topK = 40,
      numPredict = 2048,
      verbose = true,
      useConfigModel = true
    } = options;

    try {
      // Select best available model from config
      const model = useConfigModel 
        ? await this.selectBestModel() 
        : this.model;

      if (verbose) {
        console.log(`📡 Connecting to Ollama at ${this.url}...`);
        console.log(`🤖 Model: ${model}${this.fallbackUsed ? ' (fallback)' : ''}`);
      }

      const response = await fetch(`${this.url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false,
          options: {
            temperature,
            top_p: topP,
            top_k: topK,
            num_predict: numPredict
          }
        }),
        timeout: this.timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.response) {
        throw new Error('Empty response from Ollama');
      }

      if (verbose) {
        console.log('✅ Content generated successfully');
      }

      return {
        success: true,
        content: data.response,
        model: data.model,
        tokens: data.eval_count || 0,
        usedFallback: this.fallbackUsed
      };
    } catch (error) {
      if (verbose) {
        console.error('❌ Ollama generation failed:', error.message);
      }

      return {
        success: false,
        error: error.message,
        content: null,
        usedFallback: this.fallbackUsed
      };
    }
  }

  async modelExists() {
    try {
      const response = await fetch(`${this.url}/api/tags`);
      if (!response.ok) return false;

      const data = await response.json();
      const models = data.models || [];
      const baseModel = this.model.split(':')[0];
      return models.some(m => m.name.includes(baseModel) || m.name.includes(this.model));
    } catch (error) {
      return false;
    }
  }

  async listModels() {
    try {
      const response = await fetch(`${this.url}/api/tags`);
      if (!response.ok) throw new Error('Failed to list models');
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error listing models:', error.message);
      return [];
    }
  }
}

module.exports = OllamaInference;
