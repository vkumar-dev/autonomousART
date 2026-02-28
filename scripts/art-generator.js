#!/usr/bin/env node

/**
 * Art Generator for autonomousART
 * Uses Pollinations.ai for AI image generation (free, unlimited, no API key)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ARTWORKS_DIR = path.join(__dirname, '..', 'artworks');
const CONCEPT_FILE = path.join(__dirname, '..', 'selected-concept.json');

/**
 * Download image from URL with retry
 */
function downloadImage(url, outputPath, retries = 3) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    let attempt = 0;
    
    const tryDownload = () => {
      attempt++;
      console.log(`   Download attempt ${attempt}/${retries}...`);
      
      const file = fs.createWriteStream(outputPath);
      let downloaded = false;
      
      protocol.get(url, (response) => {
        if (response.statusCode === 200) {
          downloaded = true;
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        } else {
          file.close();
          fs.unlink(outputPath, () => {});
          
          if (attempt < retries && response.statusCode >= 500) {
            console.log(`   HTTP ${response.statusCode}, retrying in 2s...`);
            setTimeout(tryDownload, 2000);
          } else {
            reject(new Error(`HTTP ${response.statusCode}`));
          }
        }
      }).on('error', (err) => {
        file.close();
        fs.unlink(outputPath, () => {});
        
        if (attempt < retries) {
          console.log(`   Error: ${err.message}, retrying in 2s...`);
          setTimeout(tryDownload, 2000);
        } else {
          reject(err);
        }
      });
    };
    
    tryDownload();
  });
}

/**
 * Build detailed image prompt from concept
 */
function buildImagePrompt(concept) {
  const { title, concept: description, technique, colors, tone } = concept;
  
  const parts = [
    description || title,
    technique ? `style: ${technique}` : '',
    tone ? `mood: ${tone}` : '',
    colors?.length ? `colors: ${colors.join(', ')}` : '',
    'generative art',
    'digital artwork',
    'high quality',
    'abstract'
  ].filter(Boolean);
  
  return parts.join(', ');
}

/**
 * Generate image using Pollinations.ai with fallback
 */
async function generateArt() {
  // Load concept
  if (!fs.existsSync(CONCEPT_FILE)) {
    throw new Error('No concept found. Run concept-selector.js first.');
  }

  const concept = JSON.parse(fs.readFileSync(CONCEPT_FILE, 'utf8'));
  console.log('🎨 Generating art for:', concept.title);

  // Build prompt
  const prompt = buildImagePrompt(concept);
  console.log('📝 Image prompt:', prompt);

  // Pollinations.ai settings
  const width = 1024;
  const height = 1024;
  const seed = Math.floor(Math.random() * 1000000);
  
  // Try multiple models for reliability
  const models = ['flux', 'stable-diffusion'];
  let success = false;
  let imageData = null;
  
  for (const model of models) {
    try {
      console.log(`\n🔄 Trying model: ${model}...`);
      
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true`;
      
      console.log(`🖼️  Model: ${model}`);
      console.log(`📐 Size: ${width}x${height}`);
      console.log(`🌱 Seed: ${seed}`);
      
      // Generate filenames
      const timestamp = generateTimestamp();
      const slug = generateSlug(concept.title);
      const imageFilename = `${timestamp}-${slug}.png`;
      const imagePath = path.join(ARTWORKS_DIR, imageFilename);
      
      fs.mkdirSync(ARTWORKS_DIR, { recursive: true });
      
      // Download image
      console.log('⬇️  Downloading generated image...');
      await downloadImage(url, imagePath);
      console.log(`✅ Image saved: ${imageFilename}`);
      
      imageData = { imageFilename, imagePath, model, seed, width, height };
      success = true;
      break; // Success!
      
    } catch (error) {
      console.log(`❌ Model ${model} failed: ${error.message}`);
      if (model === models[models.length - 1]) {
        throw error; // Last model failed
      }
    }
  }
  
  if (!success || !imageData) {
    throw new Error('All models failed');
  }
  
  // Generate HTML wrapper
  const html = generateHTML(concept, imageData.imageFilename, { 
    model: imageData.model, 
    seed: imageData.seed, 
    width: imageData.width, 
    height: imageData.height 
  });
  const htmlFilename = `${imageData.imageFilename.replace('.png', '.html')}`;
  const htmlPath = path.join(ARTWORKS_DIR, htmlFilename);
  fs.writeFileSync(htmlPath, html);
  console.log(`✅ HTML wrapper: ${htmlFilename}`);
  
  // Cleanup
  if (fs.existsSync(CONCEPT_FILE)) {
    fs.unlinkSync(CONCEPT_FILE);
  }
  
  console.log('\n✨ Artwork generation complete!');
  return { image: imageData.imageFilename, html: htmlFilename };
}

/**
 * Generate HTML wrapper
 */
function generateHTML(concept, imageFilename, meta) {
  const colors = concept.colors || ['#667eea', '#764ba2'];
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${concept.title} - autonomousART</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #050505;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #fff;
      padding: 20px;
    }
    .container { max-width: 1200px; width: 100%; text-align: center; }
    .frame {
      background: #000;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 25px 80px rgba(0,0,0,0.6);
      margin-bottom: 30px;
    }
    img {
      width: 100%;
      height: auto;
      display: block;
    }
    .info {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      padding: 30px;
      border-radius: 16px;
      max-width: 700px;
      margin: 0 auto;
    }
    h1 {
      font-size: 28px;
      margin-bottom: 15px;
      background: linear-gradient(135deg, ${colors[0]}, ${colors[1] || '#999'});
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      font-size: 16px;
      line-height: 1.7;
      opacity: 0.9;
      margin-bottom: 20px;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      margin-top: 20px;
    }
    .tag {
      background: rgba(255,255,255,0.1);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
    }
    .colors {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin-top: 20px;
    }
    .swatch {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.2);
    }
    .back {
      display: inline-block;
      margin-top: 25px;
      color: #fff;
      text-decoration: none;
      background: rgba(255,255,255,0.1);
      padding: 12px 28px;
      border-radius: 30px;
      font-size: 14px;
      transition: all 0.3s;
    }
    .back:hover {
      background: rgba(255,255,255,0.2);
      transform: translateY(-2px);
    }
    .badge {
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      padding: 8px 18px;
      border-radius: 24px;
      font-size: 13px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="badge">🖼️ AI-Generated Art</div>
  
  <div class="container">
    <div class="frame">
      <img src="${imageFilename}" alt="${concept.title}" />
    </div>
    
    <div class="info">
      <h1>${concept.title}</h1>
      <p>${concept.concept || 'An AI-generated artwork exploring the intersection of technology and creativity.'}</p>
      
      <div class="meta">
        <span class="tag">🎨 ${concept.technique || 'Generative Art'}</span>
        <span class="tag">🤖 ${meta.model}</span>
        <span class="tag">🌱 Seed: ${meta.seed}</span>
        <span class="tag">📐 ${meta.width}×${meta.height}</span>
      </div>
      
      ${colors?.length ? `
      <div class="colors">
        ${colors.slice(0, 5).map(c => `<div class="swatch" style="background:${c}"></div>`).join('')}
      </div>
      ` : ''}
    </div>
    
    <a href="../index.html" class="back">← Back to Gallery</a>
  </div>
</body>
</html>`;
}

function generateTimestamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ].join('');
}

function generateSlug(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Main
if (require.main === module) {
  generateArt()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Error:', err.message);
      process.exit(1);
    });
}

module.exports = { generateArt };
