#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ARTWORKS_DIR = path.join(__dirname, '..', 'artworks');
const CONCEPT_FILE = path.join(__dirname, '..', 'selected-concept.json');

function generateCanvasArt(concept) {
  const timestamp = generateTimestamp();
  const slug = generateSlug(concept.title);
  const filename = `${timestamp}-${slug}.html`;
  const filepath = path.join(ARTWORKS_DIR, filename);

  fs.mkdirSync(ARTWORKS_DIR, { recursive: true });
  fs.writeFileSync(filepath, generateHTML(concept));

  console.log(`✅ Artwork created: ${filename}`);
  return { html: filename };
}

function generateHTML(concept) {
  const colors = concept.colors || ['#667eea', '#764ba2', '#f093fb', '#4facfe'];
  const technique = (concept.technique || 'Abstract').toLowerCase();

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
    canvas {
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
    p { font-size: 16px; line-height: 1.7; opacity: 0.9; margin-bottom: 20px; }
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
  </style>
</head>
<body>
  <div class="container">
    <div class="frame">
      <canvas id="artCanvas" width="1024" height="1024"></canvas>
    </div>

    <div class="info">
      <h1>${concept.title}</h1>
      <p>${concept.concept || 'A unique generative art piece.'}</p>

      <div class="meta">
        <span class="tag">🎨 ${concept.technique || 'Generative Art'}</span>
        <span class="tag">🖼️ ${concept.interaction || 'Animated'}</span>
      </div>

      <div class="colors">
        ${colors.slice(0, 5).map(c => `<div class="swatch" style="background:${c}"></div>`).join('')}
      </div>
    </div>

    <a href="../index.html" class="back">← Back to Gallery</a>
  </div>

  <script>
    const canvas = document.getElementById('artCanvas');
    const ctx = canvas.getContext('2d');
    const colors = ${JSON.stringify(colors)};
    const technique = '${technique}';

    function random(min, max) {
      return Math.random() * (max - min) + min;
    }

    function randomChoice(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    ${getArtCode(technique, colors, concept)}

    init();
  </script>
</body>
</html>`;
}

function getArtCode(technique, colors, concept) {
  const code = {
    'fractal': `
    let zoom = 1, offsetX = 0, offsetY = 0;
    const maxIter = 100;

    function mandelbrot(cx, cy) {
      let x = 0, y = 0, x2 = 0, y2 = 0, iter = 0;
      while (x2 + y2 <= 4 && iter < maxIter) {
        y = 2 * x * y + cy;
        x = x2 - y2 + cx;
        x2 = x * x;
        y2 = y * y;
        iter++;
      }
      return iter;
    }

    function draw() {
      const w = canvas.width, h = canvas.height;
      const imgData = ctx.createImageData(w, h);
      
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const x0 = (px - w / 2) / (0.5 * zoom * w) + offsetX;
          const y0 = (py - h / 2) / (0.5 * zoom * h) + offsetY;
          const iter = mandelbrot(x0, y0);
          const idx = (py * w + px) * 4;
          
          if (iter === maxIter) {
            imgData.data[idx] = imgData.data[idx+1] = imgData.data[idx+2] = 0;
          } else {
            const t = iter / maxIter;
            const color = colors[Math.floor(t * colors.length) % colors.length];
            imgData.data[idx] = parseInt(color.slice(1, 3), 16);
            imgData.data[idx + 1] = parseInt(color.slice(3, 5), 16);
            imgData.data[idx + 2] = parseInt(color.slice(5, 7), 16);
          }
          imgData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    let frame = 0;
    function animate() {
      zoom = 1 + Math.sin(frame * 0.01) * 0.5;
      offsetX = Math.cos(frame * 0.005) * 0.5;
      offsetY = Math.sin(frame * 0.005) * 0.5;
      draw();
      frame++;
      requestAnimationFrame(animate);
    }

    function init() {
      animate();
    }
    `,

    'particle': `
    const particles = [];

    class Particle {
      constructor() {
        this.x = random(0, canvas.width);
        this.y = random(0, canvas.height);
        this.vx = random(-2, 2);
        this.vy = random(-2, 2);
        this.size = random(2, 8);
        this.color = randomChoice(colors);
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }

      draw() {
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function init() {
      for (let i = 0; i < 100; i++) particles.push(new Particle());
      animate();
    }

    function animate() {
      ctx.fillStyle = 'rgba(5, 5, 10, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      requestAnimationFrame(animate);
    }
    `,

    'wave': `
    const waves = [];

    class Wave {
      constructor() {
        this.y = random(0, canvas.height);
        this.amplitude = random(20, 80);
        this.frequency = random(0.005, 0.02);
        this.phase = random(0, Math.PI * 2);
        this.speed = random(0.02, 0.05);
        this.color = randomChoice(colors);
      }

      draw(time) {
        ctx.beginPath();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.7;

        for (let x = 0; x < canvas.width; x++) {
          const y = this.y + Math.sin(x * this.frequency + this.phase + time * this.speed) * this.amplitude;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    function init() {
      for (let i = 0; i < 15; i++) waves.push(new Wave());
      animate();
    }

    function animate() {
      ctx.fillStyle = 'rgba(5, 5, 10, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const time = Date.now() * 0.001;
      waves.forEach(w => w.draw(time));
      requestAnimationFrame(animate);
    }
    `,

    'physics': `
    const bodies = [];
    const G = 0.5;

    class Body {
      constructor() {
        this.x = random(200, canvas.width - 200);
        this.y = random(200, canvas.height - 200);
        this.vx = random(-0.5, 0.5);
        this.vy = random(-0.5, 0.5);
        this.mass = random(10, 50);
        this.color = randomChoice(colors);
        this.trail = [];
      }

      update() {
        for (let other of bodies) {
          if (other === this) continue;
          const dx = other.x - this.x, dy = other.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 5) {
            const force = G * this.mass * other.mass / (dist * dist);
            this.vx += (dx / dist) * force / this.mass;
            this.vy += (dy / dist) * force / this.mass;
          }
        }
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 50) this.trail.shift();
      }

      draw() {
        ctx.beginPath();
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 2;
        for (let i = 0; i < this.trail.length; i++) {
          const p = this.trail[i];
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 1;
        ctx.arc(this.x, this.y, this.mass / 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function init() {
      for (let i = 0; i < 20; i++) bodies.push(new Body());
      animate();
    }

    function animate() {
      ctx.fillStyle = 'rgba(5, 5, 10, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      bodies.forEach(b => { b.update(); b.draw(); });
      requestAnimationFrame(animate);
    }
    `,

    'abstract': `
    const elements = [];

    class Element {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = random(0, canvas.width);
        this.y = random(0, canvas.height);
        this.size = random(10, 80);
        this.type = randomChoice(['circle', 'rect', 'line']);
        this.color = randomChoice(colors);
        this.speedX = random(-0.3, 0.3);
        this.speedY = random(-0.3, 0.3);
        this.rotation = random(0, Math.PI * 2);
        this.rotSpeed = random(-0.02, 0.02);
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotSpeed;
        if (this.x < -100 || this.x > canvas.width + 100 ||
            this.y < -100 || this.y > canvas.height + 100) this.reset();
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.6;
        if (this.type === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (this.type === 'rect') {
          ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else if (this.type === 'line') {
          ctx.strokeStyle = this.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-this.size / 2, 0);
          ctx.lineTo(this.size / 2, 0);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    function init() {
      for (let i = 0; i < 150; i++) elements.push(new Element());
      animate();
    }

    function animate() {
      ctx.fillStyle = 'rgba(5, 5, 10, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      elements.forEach(e => { e.update(); e.draw(); });
      requestAnimationFrame(animate);
    }
    `
  };

  const key = Object.keys(code).find(k => technique.includes(k)) || 'abstract';
  return code[key];
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

async function generateArt() {
  if (!fs.existsSync(CONCEPT_FILE)) {
    throw new Error('No concept found. Run concept-selector.js or ollama-concept-generator.js first.');
  }

  const concept = JSON.parse(fs.readFileSync(CONCEPT_FILE, 'utf8'));
  console.log('🎨 Generating art for:', concept.title);
  console.log('   Technique:', concept.technique);
  console.log('   Colors:', concept.colors?.join(', '));

  const result = generateCanvasArt(concept);

  if (fs.existsSync(CONCEPT_FILE)) {
    fs.unlinkSync(CONCEPT_FILE);
  }

  console.log('\n✨ Artwork generation complete!');
  return result;
}

if (require.main === module) {
  generateArt()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Error:', err.message);
      process.exit(1);
    });
}

module.exports = { generateArt };
