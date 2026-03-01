#!/usr/bin/env node

const fetch = require('node-fetch');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';

class OllamaInference {
  constructor(url = OLLAMA_URL, model = OLLAMA_MODEL) {
    this.url = url;
    this.model = model;
    this.timeout = 600000;
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
      verbose = true
    } = options;

    try {
      if (verbose) {
        console.log(`📡 Connecting to Ollama at ${this.url}...`);
        console.log(`🤖 Model: ${this.model}`);
      }

      const response = await fetch(`${this.url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
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
        tokens: data.eval_count || 0
      };
    } catch (error) {
      if (verbose) {
        console.error('❌ Ollama generation failed:', error.message);
      }

      return {
        success: false,
        error: error.message,
        content: null
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
