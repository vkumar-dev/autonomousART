#!/usr/bin/env node

/**
 * Image Generator for autonomousART
 * Uses Pollinations.ai for free, unlimited text-to-image generation
 * No API key required
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ARTWORKS_DIR = path.join(__dirname, '..', 'artworks');
const CONCEPT_FILE = path.join(__dirname, '..', 'selected-concept.json');

/**
 * Download image from URL and save to file
 */
function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const file = fs.createWriteStream(outputPath);
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

/**
 * Generate image using Pollinations.ai
 * Free, unlimited, no API key required
 */
async function generateImage(concept) {
  console.log('🖼️  Generating image with Pollinations.ai...\n');
  
  // Build prompt from concept
  const prompt = buildImagePrompt(concept);
  
  // Pollinations.ai URL format
  // https://image.pollinations.ai/prompt/{encoded_prompt}?width={w}&height={h}&seed={seed}&model={model}&nologo=true
  const width = 1024;
  const height = 1024;
  const seed = Math.floor(Math.random() * 1000000);
  const model = 'flux'; // or 'stable-diffusion'
  
  const encodedPrompt = encodeURIComponent(prompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true`;
  
  console.log(`📝 Image prompt: ${prompt}`);
  console.log(`🎨 Model: ${model}`);
  console.log(`📐 Size: ${width}x${height}`);
  console.log(`🌱 Seed: ${seed}`);
  console.log(`🔗 URL: ${imageUrl}\n`);
  
  // Generate timestamp and slug
  const timestamp = generateTimestamp();
  const slug = generateSlug(concept.title);
  const imageFilename = `${timestamp}-${slug}.png`;
  const imagePath = path.join(ARTWORKS_DIR, imageFilename);
  
  // Ensure directory exists
  fs.mkdirSync(ARTWORKS_DIR, { recursive: true });
  
  // Download and save image
  console.log('⬇️  Downloading generated image...');
  await downloadImage(imageUrl, imagePath);
  
  console.log(`✅ Image saved: ${imageFilename}`);
  
  return {
    filename: imageFilename,
    prompt: prompt,
    model: model,
    seed: seed,
    width: width,
    height: height,
    source: 'pollinations.ai'
  };
}

/**
 * Build detailed image generation prompt from concept
 */
function buildImagePrompt(concept) {
  const { title, concept: description, technique, colors, tone } = concept;
  
  // Create a rich prompt for image generation
  const promptParts = [
    description || title,
    `art style: ${technique || 'generative art'}`,
    `mood: ${tone || 'artistic'}`,
    colors && colors.length > 0 ? `color palette: ${colors.join(', ')}` : '',
    'high quality',
    'digital art',
    'abstract'
  ].filter(Boolean);
  
  return promptParts.join(', ');
}

/**
 * Generate HTML wrapper for the image artwork
 */
function generateImageHTML(concept, imageData) {
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
      font-family: 'Courier New', monospace;
      color: #fff;
    }
    .container {
      max-width: 1200px;
      padding: 20px;
      text-align: center;
    }
    .artwork-frame {
      background: #000;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      margin-bottom: 30px;
    }
    .artwork-image {
      width: 100%;
      height: auto;
      display: block;
    }
    .info {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      padding: 25px;
      border-radius: 12px;
      max-width: 600px;
      margin: 0 auto 20px;
    }
    .info h1 {
      font-size: 24px;
      margin-bottom: 10px;
      background: linear-gradient(135deg, ${concept.colors?.[0] || '#666'}, ${concept.colors?.[1] || '#999'});
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .info p {
      font-size: 14px;
      line-height: 1.6;
      opacity: 0.9;
      margin-bottom: 15px;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      justify-content: center;
      margin-top: 15px;
      font-size: 12px;
      opacity: 0.7;
    }
    .meta-item {
      background: rgba(255,255,255,0.1);
      padding: 5px 12px;
      border-radius: 20px;
    }
    .colors {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin-top: 15px;
    }
    .color-swatch {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.2);
    }
    .back {
      display: inline-block;
      color: #fff;
      text-decoration: none;
      background: rgba(255,255,255,0.1);
      padding: 12px 24px;
      border-radius: 30px;
      font-size: 14px;
      transition: all 0.3s ease;
    }
    .back:hover {
      background: rgba(255,255,255,0.2);
      transform: translateY(-2px);
    }
    .badge {
      position: absolute;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="badge">🖼️ AI-Generated Image</div>
  
  <div class="container">
    <div class="artwork-frame">
      <img src="${imageData.filename}" alt="${concept.title}" class="artwork-image" />
    </div>
    
    <div class="info">
      <h1>${concept.title}</h1>
      <p>${concept.concept || 'An AI-generated artwork exploring the intersection of technology and creativity.'}</p>
      
      <div class="meta">
        <span class="meta-item">🎨 ${concept.technique || 'Generative Art'}</span>
        <span class="meta-item">🤖 ${imageData.model}</span>
        <span class="meta-item">🌱 Seed: ${imageData.seed}</span>
        <span class="meta-item">📐 ${imageData.width}×${imageData.height}</span>
      </div>
      
      ${concept.colors && concept.colors.length > 0 ? `
      <div class="colors">
        ${concept.colors.slice(0, 5).map(color => `
          <div class="color-swatch" style="background: ${color}"></div>
        `).join('')}
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
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Main generation function
 */
async function generateImageArt() {
  // Load concept
  if (!fs.existsSync(CONCEPT_FILE)) {
    throw new Error('No concept selected. Run concept-selector.js first.');
  }
  
  const concept = JSON.parse(fs.readFileSync(CONCEPT_FILE, 'utf8'));
  console.log('🎨 Generating image art for:', concept.title);
  
  // Generate image
  const imageData = await generateImage(concept);
  
  // Generate HTML wrapper
  const html = generateImageHTML(concept, imageData);
  
  // Save HTML file
  const timestamp = generateTimestamp();
  const slug = generateSlug(concept.title);
  const htmlFilename = `${timestamp}-${slug}.html`;
  const htmlPath = path.join(ARTWORKS_DIR, htmlFilename);
  
  fs.writeFileSync(htmlPath, html);
  console.log(`✅ HTML wrapper created: ${htmlFilename}`);
  
  // Update concept with image info
  concept.artType = 'image';
  concept.imageData = imageData;
  fs.writeFileSync(CONCEPT_FILE, JSON.stringify(concept, null, 2));
  
  console.log('\n✅ Image artwork generation complete!');
  console.log(`   Image: ${imageData.filename}`);
  console.log(`   HTML: ${htmlFilename}`);
  console.log(`   Model: ${imageData.model}`);
  console.log(`   Source: ${imageData.source}`);
  
  return {
    concept,
    imageData,
    htmlFile: htmlFilename
  };
}

// Main execution
if (require.main === module) {
  generateImageArt()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = { generateImageArt, generateImage, buildImagePrompt };
