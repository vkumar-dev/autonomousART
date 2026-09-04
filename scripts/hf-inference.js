#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const INFERENCE_SCRIPT = path.join(__dirname, 'hf_inference.py');
const RESOLVER_SCRIPT = path.join(__dirname, 'model_resolver.py');
const MODEL_FILE = path.join(ROOT, 'selected-model.json');

class HfInference {
  constructor(options = {}) {
    this.pythonBin = options.pythonBin || process.env.PYTHON || 'python3';
    this.timeout = options.timeout || 25 * 60 * 1000;
  }

  ensureModelSelection() {
    if (fs.existsSync(MODEL_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(MODEL_FILE, 'utf8'));
      } catch (e) {
        // re-run resolver if invalid JSON
      }
    }
    console.log('Selecting a public non-gated Hugging Face GGUF model…');
    const result = spawnSync(this.pythonBin, [RESOLVER_SCRIPT], {
      cwd: ROOT,
      encoding: 'utf8',
      env: process.env,
      timeout: 5 * 60 * 1000
    });
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    if (result.status !== 0) {
      throw new Error(`model_resolver.py failed with exit code ${result.status}`);
    }
    return JSON.parse(fs.readFileSync(MODEL_FILE, 'utf8'));
  }

  generate(prompt, options = {}) {
    this.ensureModelSelection();
    const promptPath = path.join(os.tmpdir(), `autonomousart-prompt-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
    fs.writeFileSync(promptPath, prompt, 'utf8');

    const args = ['--prompt-file', promptPath];
    if (options.temperature) args.push('--temperature', String(options.temperature));
    if (options.maxTokens) args.push('--max-tokens', String(options.maxTokens));
    if (options.system) args.push('--system', String(options.system));

    try {
      const result = spawnSync(this.pythonBin, [INFERENCE_SCRIPT, ...args], {
        cwd: ROOT,
        encoding: 'utf8',
        env: process.env,
        maxBuffer: 20 * 1024 * 1024,
        timeout: options.timeout || this.timeout
      });

      if (result.stderr) {
        process.stderr.write(result.stderr);
      }

      if (result.status !== 0) {
        return {
          success: false,
          error: result.error ? result.error.message : `hf_inference.py exited with code ${result.status}`,
          content: ''
        };
      }

      const content = (result.stdout || '').trim();
      return {
        success: true,
        content
      };
    } finally {
      try {
        fs.unlinkSync(promptPath);
      } catch (e) {}
    }
  }
}

module.exports = HfInference;
