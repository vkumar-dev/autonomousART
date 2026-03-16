#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'stable-diffusion';
const OUTPUT_DIR = path.join(__dirname, '..', 'generated-images');

const IMAGE_MODELS = [
  'stable-diffusion',
  'flux',
  'playground-v2.5'
];

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      } else {
        reject(new Error(`Request failed: ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

function httpPost(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;
    
    const postData = JSON.stringify(data);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = lib.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve({ raw: responseData });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function checkOllamaAvailable() {
  try {
    const response = await httpGet(`${OLLAMA_URL}/api/tags`);
    return true;
  } catch (error) {
    console.error('❌ Ollama not available at', OLLAMA_URL);
    return false;
  }
}

async function pullModel(model) {
  console.log(`📥 Pulling model: ${model}...`);
  try {
    const response = await httpPost(`${OLLAMA_URL}/api/pull`, {
      name: model,
      stream: false
    });
    console.log('✅ Model pulled successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to pull model:', error.message);
    return false;
  }
}

async function generateImage(prompt, model, outputFilename) {
  console.log(`\n🎨 Generating image...`);
  console.log(`   Model: ${model}`);
  console.log(`   Prompt: ${prompt}`);
  
  try {
    const response = await httpPost(`${OLLAMA_URL}/api/generate`, {
      model: model,
      prompt: prompt,
      stream: false
    });

    if (response.image || response.b64) {
      const base64Data = response.image || response.b64;
      const buffer = Buffer.from(base64Data, 'base64');
      
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      const filepath = path.join(OUTPUT_DIR, outputFilename);
      fs.writeFileSync(filepath, buffer);
      
      console.log(`✅ Image saved: ${filepath}`);
      return { success: true, path: filepath };
    } else if (response.error) {
      console.error('❌ Ollama error:', response.error);
      return { success: false, error: response.error };
    } else {
      console.error('❌ No image data in response');
      console.log('Response:', JSON.stringify(response, null, 2));
      return { success: false, error: 'No image data' };
    }
  } catch (error) {
    console.error('❌ Generation failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function listModels() {
  try {
    const response = await httpGet(`${OLLAMA_URL}/api/tags`);
    const data = JSON.parse(response);
    return data.models || [];
  } catch (error) {
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🎨 Ollama Image Generator for autonomousART

Usage:
  node scripts/ollama-image-gen.js [options]

Options:
  --prompt <text>   Description of the art to generate
  --model <name>    Image generation model (default: stable-diffusion)
  --count <n>       Number of images to generate (default: 1)
  --output <dir>    Output directory (default: generated-images)
  --pull            Pull the model before generating
  --list            List available models
  --help, -h        Show this help

Examples:
  node scripts/ollama-image-gen.js --prompt "abstract cosmic art"
  node scripts/ollama-image-gen.js --model flux --prompt "fractal nebula"
  node scripts/ollama-image-gen.js --pull --model stable-diffusion

Supported Models:
  - stable-diffusion
  - flux
  - playground-v2.5
`);
    process.exit(0);
  }

  const options = {
    prompt: 'abstract generative art with vibrant colors, fractal patterns, cosmic nebula',
    model: OLLAMA_MODEL,
    count: 1,
    output: OUTPUT_DIR,
    pull: false,
    list: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--prompt' && args[i + 1]) {
      options.prompt = args[++i];
    } else if (args[i] === '--model' && args[i + 1]) {
      options.model = args[++i];
    } else if (args[i] === '--count' && args[i + 1]) {
      options.count = parseInt(args[++i], 10);
    } else if (args[i] === '--output' && args[i + 1]) {
      options.output = args[++i];
    } else if (args[i] === '--pull') {
      options.pull = true;
    } else if (args[i] === '--list') {
      options.list = true;
    }
  }

  console.log('🎨 Ollama Image Generator\n');

  const available = await checkOllamaAvailable();
  if (!available) {
    console.log('\n💡 Hint: Start Ollama with: ollama serve');
    process.exit(1);
  }

  if (options.list) {
    const models = await listModels();
    console.log('📦 Available models:');
    models.forEach(m => console.log(`   - ${m.name}`));
    process.exit(0);
  }

  if (options.pull) {
    await pullModel(options.model);
  }

  const timestamp = Date.now();
  const results = [];

  for (let i = 1; i <= options.count; i++) {
    const filename = `art_${timestamp}_${i}.png`;
    const result = await generateImage(options.prompt, options.model, filename);
    results.push(result);
    
    if (i < options.count) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`\n✅ Generated ${successCount}/${options.count} image(s)`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
}

module.exports = { generateImage, checkOllamaAvailable, pullModel, listModels };
