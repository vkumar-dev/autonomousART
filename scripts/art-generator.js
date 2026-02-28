#!/usr/bin/env node

/**
 * Art Generator for autonomousART
 * Converts concepts to HTML/Canvas art pieces
 */

const fs = require('fs');
const path = require('path');

const CONCEPT_FILE = path.join(__dirname, '..', 'selected-concept.json');
const ARTWORKS_DIR = path.join(__dirname, '..', 'artworks');

// Art technique templates
const TECHNIQUES = {
  'Fractal Mathematics': generateFractalArt,
  'Particle Dynamics': generateParticleArt,
  'Perlin Noise Landscapes': generatePerlinArt,
  'Generative Geometry': generateGeometryArt,
  'Cellular Automata': generateCellularArt,
  'Color Theory': generateColorArt,
  'Interactive Physics': generatePhysicsArt,
  'Abstract Expressionism': generateExpressionistArt
};

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

function generateFractalArt(concept) {
  const colors = concept.colors.join("','").slice(0, -1);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${concept.title} - autonomousART</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #000;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: 'Courier New', monospace;
      overflow: hidden;
    }
    .container {
      position: relative;
      width: 100%;
      height: 100vh;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    .info {
      position: absolute;
      top: 20px;
      left: 20px;
      color: #fff;
      z-index: 10;
      background: rgba(0,0,0,0.7);
      padding: 15px 20px;
      border-radius: 8px;
      max-width: 300px;
    }
    .info h1 { font-size: 18px; margin-bottom: 5px; }
    .info p { font-size: 12px; opacity: 0.8; line-height: 1.4; }
    .back {
      position: absolute;
      bottom: 20px;
      left: 20px;
      color: #fff;
      text-decoration: none;
      background: rgba(0,0,0,0.7);
      padding: 10px 15px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 10;
    }
    .back:hover { background: rgba(0,0,0,0.9); }
  </style>
</head>
<body>
  <div class="container">
    <canvas id="canvas"></canvas>
    <div class="info">
      <h1>${concept.title}</h1>
      <p>${concept.concept}</p>
      <p style="margin-top: 10px; font-size: 10px;">🎨 ${concept.technique}</p>
    </div>
    <a href="../index.html" class="back">← Back to Gallery</a>
  </div>

  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const colors = ['${colors}'];
    
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    
    function mandelbrot(x, y, maxIter) {
      let zx = 0, zy = 0;
      for (let i = 0; i < maxIter; i++) {
        const zx2 = zx * zx;
        const zy2 = zy * zy;
        if (zx2 + zy2 > 4) return i;
        zy = 2 * zx * zy + y;
        zx = zx2 - zy2 + x;
      }
      return maxIter;
    }
    
    function draw() {
      const maxIter = 100;
      const zoom = 0.005 + 0.002 * Math.sin(Date.now() * 0.0002);
      const panX = -0.743643887037151 + 0.05 * Math.sin(Date.now() * 0.0001);
      const panY = 0.13182590420533 + 0.05 * Math.cos(Date.now() * 0.00008);
      
      for (let py = 0; py < canvas.height; py++) {
        for (let px = 0; px < canvas.width; px++) {
          const x = (px - canvas.width / 2) * zoom + panX;
          const y = (py - canvas.height / 2) * zoom + panY;
          const iter = mandelbrot(x, y, maxIter);
          const hue = (iter / maxIter * 360) % 360;
          ctx.fillStyle = \`hsl(\${hue}, 100%, 50%)\`;
          ctx.fillRect(px, py, 1, 1);
        }
      }
      requestAnimationFrame(draw);
    }
    
    resize();
    window.addEventListener('resize', resize);
    draw();
  </script>
</body>
</html>`;
}

function generateParticleArt(concept) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${concept.title} - autonomousART</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0e27;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      overflow: hidden;
    }
    canvas { display: block; }
    .info {
      position: absolute;
      top: 20px;
      left: 20px;
      color: #fff;
      background: rgba(0,0,0,0.7);
      padding: 15px 20px;
      border-radius: 8px;
      max-width: 300px;
      z-index: 10;
    }
    .back {
      position: absolute;
      bottom: 20px;
      left: 20px;
      color: #fff;
      text-decoration: none;
      background: rgba(0,0,0,0.7);
      padding: 10px 15px;
      border-radius: 6px;
      z-index: 10;
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <div class="info">
    <h1>${concept.title}</h1>
    <p>${concept.concept}</p>
  </div>
  <a href="../index.html" class="back">← Back</a>

  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const attractor = { x: canvas.width / 2, y: canvas.height / 2 };
    
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 1;
        this.hue = Math.random() * 360;
      }
      
      update() {
        const dx = attractor.x - this.x;
        const dy = attractor.y - this.y;
        const dist = Math.hypot(dx, dy);
        const force = 1000 / (dist * dist + 1);
        
        this.vx += (dx / dist) * force * 0.01;
        this.vy += (dy / dist) * force * 0.01;
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.002;
        
        this.vx *= 0.99;
        this.vy *= 0.99;
      }
      
      draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = \`hsl(\${this.hue}, 100%, 50%)\`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    function animate() {
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#0a0e27';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0) particles.splice(i, 1);
      }
      
      for (let i = 0; i < 5; i++) {
        particles.push(new Particle());
      }
      
      attractor.x += Math.sin(Date.now() * 0.0005) * 50;
      attractor.y += Math.cos(Date.now() * 0.0003) * 50;
      
      requestAnimationFrame(animate);
    }
    
    animate();
  </script>
</body>
</html>`;
}

function generatePerlinArt(concept) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${concept.title} - autonomousART</title>
  <style>
    body { margin: 0; background: #000; overflow: hidden; }
    canvas { display: block; }
    .info {
      position: absolute;
      top: 20px;
      left: 20px;
      color: #fff;
      background: rgba(0,0,0,0.7);
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10;
    }
    .back {
      position: absolute;
      bottom: 20px;
      left: 20px;
      color: #fff;
      text-decoration: none;
      background: rgba(0,0,0,0.7);
      padding: 10px 15px;
      border-radius: 6px;
      z-index: 10;
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <div class="info">
    <h1>${concept.title}</h1>
    <p>${concept.concept}</p>
  </div>
  <a href="../index.html" class="back">← Back</a>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/simplex-noise/2.4.0/simplex-noise.js"></script>
  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const simplex = new SimplexNoise(Math.random);
    let time = 0;
    
    function getColor(value) {
      const h = (value * 360 + time * 0.5) % 360;
      const s = 100;
      const l = 50 + value * 30;
      return \`hsl(\${h}, \${s}%, \${l}%)\`;
    }
    
    function animate() {
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const value = (simplex.noise3D(
            x * 0.005,
            y * 0.005,
            time * 0.001
          ) + 1) / 2;
          
          const color = getColor(value);
          const rgb = color.match(/\\d+/g);
          
          const idx = (y * canvas.width + x) * 4;
          data[idx] = parseInt(rgb[0]);
          data[idx + 1] = parseInt(rgb[1]);
          data[idx + 2] = parseInt(rgb[2]);
          data[idx + 3] = 255;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      time++;
      requestAnimationFrame(animate);
    }
    
    animate();
  </script>
</body>
</html>`;
}

function generateGeometryArt(concept) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${concept.title} - autonomousART</title>
  <style>
    body { margin: 0; background: #000; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    svg { max-width: 100%; max-height: 100%; }
    .info {
      position: absolute;
      top: 20px;
      left: 20px;
      color: #fff;
      background: rgba(0,0,0,0.7);
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10;
    }
    .back {
      position: absolute;
      bottom: 20px;
      left: 20px;
      color: #fff;
      text-decoration: none;
      background: rgba(0,0,0,0.7);
      padding: 10px 15px;
      border-radius: 6px;
      z-index: 10;
    }
  </style>
</head>
<body>
  <svg width="800" height="800" id="svg"></svg>
  <div class="info">
    <h1>${concept.title}</h1>
    <p>${concept.concept}</p>
  </div>
  <a href="../index.html" class="back">← Back</a>

  <script>
    const svg = document.getElementById('svg');
    const center = 400;
    const colors = ['${concept.colors.join("','").slice(0, -1)}'];
    
    function drawMandala(radius, depth) {
      const petals = 6 + depth;
      for (let i = 0; i < petals; i++) {
        const angle = (i / petals) * Math.PI * 2;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', radius * 0.3);
        circle.setAttribute('fill', colors[depth % colors.length]);
        circle.setAttribute('opacity', (10 - depth) / 10);
        svg.appendChild(circle);
      }
    }
    
    for (let depth = 0; depth < 8; depth++) {
      drawMandala(50 + depth * 30, depth);
    }
    
    // Add rotation animation
    svg.style.animation = 'rotate 20s linear infinite';
    const style = document.createElement('style');
    style.textContent = '@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  </script>
</body>
</html>`;
}

function generateCellularArt(concept) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${concept.title} - autonomousART</title>
  <style>
    body { margin: 0; background: #000; overflow: hidden; }
    canvas { display: block; }
    .info {
      position: absolute;
      top: 20px;
      left: 20px;
      color: #fff;
      background: rgba(0,0,0,0.7);
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10;
    }
    .back {
      position: absolute;
      bottom: 20px;
      left: 20px;
      color: #fff;
      text-decoration: none;
      background: rgba(0,0,0,0.7);
      padding: 10px 15px;
      border-radius: 6px;
      z-index: 10;
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <div class="info">
    <h1>${concept.title}</h1>
    <p>${concept.concept}</p>
  </div>
  <a href="../index.html" class="back">← Back</a>

  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const cellSize = 10;
    const cols = Math.ceil(canvas.width / cellSize);
    const rows = Math.ceil(canvas.height / cellSize);
    let grid = Array(rows).fill(null).map(() => Array(cols).fill(Math.random() > 0.7 ? 1 : 0));
    
    const colors = ['${concept.colors.join("','").slice(0, -1)}'];
    
    function countNeighbors(x, y) {
      let count = 0;
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (i === 0 && j === 0) continue;
          const nx = (x + i + cols) % cols;
          const ny = (y + j + rows) % rows;
          count += grid[ny][nx];
        }
      }
      return count;
    }
    
    function update() {
      const newGrid = grid.map(row => [...row]);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const neighbors = countNeighbors(x, y);
          if (grid[y][x] === 1) {
            newGrid[y][x] = neighbors === 2 || neighbors === 3 ? 1 : 0;
          } else {
            newGrid[y][x] = neighbors === 3 ? 1 : 0;
          }
        }
      }
      grid = newGrid;
    }
    
    function draw() {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (grid[y][x]) {
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
          }
        }
      }
      
      update();
      setTimeout(draw, 100);
    }
    
    draw();
  </script>
</body>
</html>`;
}

function generateColorArt(concept) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${concept.title} - autonomousART</title>
  <style>
    body { margin: 0; background: #000; min-height: 100vh; }
    canvas { display: block; }
    .info {
      position: absolute;
      top: 20px;
      left: 20px;
      color: #fff;
      background: rgba(0,0,0,0.7);
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10;
    }
    .back {
      position: absolute;
      bottom: 20px;
      left: 20px;
      color: #fff;
      text-decoration: none;
      background: rgba(0,0,0,0.7);
      padding: 10px 15px;
      border-radius: 6px;
      z-index: 10;
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <div class="info">
    <h1>${concept.title}</h1>
    <p>${concept.concept}</p>
  </div>
  <a href="../index.html" class="back">← Back</a>

  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    let time = 0;
    
    function animate() {
      const width = canvas.width;
      const height = canvas.height;
      
      for (let x = 0; x < width; x++) {
        const hue = (x / width * 360 + time * 0.5) % 360;
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        
        for (let i = 0; i <= 1; i += 0.1) {
          const lightness = 30 + i * 40 + Math.sin(time * 0.005 + i) * 20;
          gradient.addColorStop(i, \`hsl(\${hue}, 100%, \${lightness}%)\`);
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, 0, 1, height);
      }
      
      time++;
      requestAnimationFrame(animate);
    }
    
    animate();
  </script>
</body>
</html>`;
}

function generatePhysicsArt(concept) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${concept.title} - autonomousART</title>
  <style>
    body { margin: 0; background: #000; }
    canvas { display: block; cursor: crosshair; }
    .info {
      position: absolute;
      top: 20px;
      left: 20px;
      color: #fff;
      background: rgba(0,0,0,0.7);
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10;
    }
    .back {
      position: absolute;
      bottom: 20px;
      left: 20px;
      color: #fff;
      text-decoration: none;
      background: rgba(0,0,0,0.7);
      padding: 10px 15px;
      border-radius: 6px;
      z-index: 10;
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <div class="info">
    <h1>${concept.title}</h1>
    <p>${concept.concept}</p>
  </div>
  <a href="../index.html" class="back">← Back</a>

  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    class Orbiter {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = (Math.random() - 0.5) * 3;
        this.mass = Math.random() * 2 + 1;
        this.trail = [];
        this.color = \`hsl(\${Math.random() * 360}, 100%, 50%)\`;
      }
      
      update(objects) {
        for (let obj of objects) {
          if (obj === this) continue;
          const dx = obj.x - this.x;
          const dy = obj.y - this.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 50) continue;
          const force = obj.mass / (dist * dist);
          this.vx += (dx / dist) * force * 0.0001;
          this.vy += (dy / dist) * force * 0.0001;
        }
        
        this.x += this.vx;
        this.y += this.vy;
        this.trail.push({x: this.x, y: this.y});
        if (this.trail.length > 100) this.trail.shift();
      }
      
      draw() {
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        this.trail.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.mass, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    const objects = Array(15).fill(null).map(() => new Orbiter());
    
    function animate() {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      for (let obj of objects) {
        obj.update(objects);
        obj.draw();
      }
      
      requestAnimationFrame(animate);
    }
    
    animate();
  </script>
</body>
</html>`;
}

function generateExpressionistArt(concept) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${concept.title} - autonomousART</title>
  <style>
    body { margin: 0; background: #0a0a0a; min-height: 100vh; }
    canvas { display: block; }
    .info {
      position: absolute;
      top: 20px;
      left: 20px;
      color: #fff;
      background: rgba(0,0,0,0.7);
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10;
    }
    .back {
      position: absolute;
      bottom: 20px;
      left: 20px;
      color: #fff;
      text-decoration: none;
      background: rgba(0,0,0,0.7);
      padding: 10px 15px;
      border-radius: 6px;
      z-index: 10;
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <div class="info">
    <h1>${concept.title}</h1>
    <p>${concept.concept}</p>
  </div>
  <a href="../index.html" class="back">← Back</a>

  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const colors = ['${concept.colors.join("','").slice(0, -1)}'];
    
    function drawStroke(x, y, size, angle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.globalAlpha = 0.6;
      ctx.fillRect(-size/2, -size/4, size, size/2);
      ctx.restore();
    }
    
    function animate() {
      ctx.fillStyle = 'rgba(10,10,10,0.02)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < 10; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 100 + 50;
        const angle = Math.random() * Math.PI * 2;
        drawStroke(x, y, size, angle);
      }
      
      requestAnimationFrame(animate);
    }
    
    animate();
  </script>
</body>
</html>`;
}

async function generateArt() {
  // Load selected concept
  if (!fs.existsSync(CONCEPT_FILE)) {
    throw new Error('No concept selected. Run concept-selector.js first.');
  }

  const concept = JSON.parse(fs.readFileSync(CONCEPT_FILE, 'utf8'));
  console.log('🎨 Generating art for:', concept.title);
  
  // Check art type and use appropriate generator
  if (concept.artType === 'image') {
    console.log('🖼️  Generating AI image artwork...');
    const { generateImageArt } = require('./image-generator');
    const result = await generateImageArt();
    return { file: result.htmlFile, filename: result.htmlFile, type: 'image' };
  }
  
  // Default: code-generated art
  console.log('💻 Generating code-based artwork...');

  // Get appropriate generator
  const generator = TECHNIQUES[concept.technique] || generateExpressionistArt;

  // Generate HTML
  const html = generator(concept);

  // Save artwork
  const timestamp = generateTimestamp();
  const slug = generateSlug(concept.title);
  const filename = `${timestamp}-${slug}.html`;
  const filepath = path.join(ARTWORKS_DIR, filename);

  // Ensure directory exists
  fs.mkdirSync(ARTWORKS_DIR, { recursive: true });

  // Write file
  fs.writeFileSync(filepath, html);
  console.log('✅ Artwork created:', filepath);

  // Clean up concept file
  if (fs.existsSync(CONCEPT_FILE)) {
    fs.unlinkSync(CONCEPT_FILE);
  }

  return { file: filepath, filename, type: 'code' };
}

// Main
async function main() {
  try {
    const result = await generateArt();
    console.log('Artwork generation complete:', result.filename);
  } catch (error) {
    console.error('❌ Error generating art:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateArt };
