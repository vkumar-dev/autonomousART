#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ARTWORKS_DIR = path.join(__dirname, '..', 'artworks');
const CONCEPT_FILE = path.join(__dirname, '..', 'selected-concept.json');

function validateJsSyntax(code) {
  if (!code || typeof code !== 'string') return false;
  try {
    new vm.Script(code);
    return true;
  } catch (e) {
    return false;
  }
}

function generateCanvasArt(concept) {
  const timestamp = generateTimestamp();
  const slug = generateSlug(concept.title);
  const filename = `${timestamp}-${slug}.html`;
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateFolder = path.join(ARTWORKS_DIR, year.toString(), month, day);
  const filepath = path.join(dateFolder, filename);

  fs.mkdirSync(dateFolder, { recursive: true });
  fs.writeFileSync(filepath, generateHTML(concept));

  const relativePath = path.relative(ARTWORKS_DIR, filepath).replace(/\\/g, '/');
  console.log(`✅ Artwork created: ${relativePath}`);
  return { html: relativePath };
}

function generateHTML(concept) {
  const colors = concept.colors || ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff'];
  const technique = (concept.technique || 'Abstract').toLowerCase();
  const hasCustomCode = concept.customCode && validateJsSyntax(concept.customCode);

  const artScript = hasCustomCode
    ? `
    // --- AI-GENERATED CANVAS CODE ---
    (function() {
      let customSucceeded = false;
      try {
        ${concept.customCode}
        if (typeof init === 'function') {
          init();
        }
        customSucceeded = true;
      } catch (err) {
        console.error('Custom AI art execution error:', err);
      }

      if (!customSucceeded) {
        console.log('Falling back to procedural engine...');
        // Run the procedural engine in its own scope: if its declarations were
        // hoisted next to the AI code's, a name collision would be a parse-time
        // SyntaxError (unreachable by try/catch) and blank the whole canvas.
        (function() {
          ${getArtCode(technique, colors, concept)}
          if (typeof init === 'function') {
            init();
          }
        })();
      }
    })();
    `
    : `
    // --- PROCEDURAL GENERATIVE ENGINE ---
    ${getArtCode(technique, colors, concept)}
    if (typeof init === 'function') {
      init();
    }
    `;

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
        ${hasCustomCode ? '<span class="tag">✨ AI Code</span>' : ''}
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
    const width = canvas.width;
    const height = canvas.height;
    const colors = ${JSON.stringify(colors)};
    const technique = '${technique}';

    // Allow AI models querying document.getElementById('canvas') or 'artCanvas' to succeed
    const _origGetElementById = document.getElementById.bind(document);
    document.getElementById = function(id) {
      if (id === 'canvas' || id === 'artCanvas') return canvas;
      return _origGetElementById(id);
    };

    function random(min, max) {
      return Math.random() * (max - min) + min;
    }

    function randomChoice(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    ${artScript}
  </script>
</body>
</html>`;
}

function getArtCode(technique, colors, concept) {
  const code = {
    // 1. Clifford Strange Attractor: Cosmic silk ribbons
    'attractor': `
    let a = random(1.2, 2.1), b = random(-2.5, -1.2);
    let c = random(1.1, 1.9), d = random(0.5, 1.4);
    let x = 0.1, y = 0.1;
    let t = 0;

    function init() {
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, width, height);
      animate();
    }

    function animate() {
      ctx.fillStyle = 'rgba(5, 5, 10, 0.04)';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(Math.sin(t * 0.05) * 0.2);

      const scale = width * 0.22;
      const batch = 2500;
      for (let i = 0; i < batch; i++) {
        const nx = Math.sin(a * y) + c * Math.cos(a * x);
        const ny = Math.sin(b * x) + d * Math.cos(b * y);
        x = nx;
        y = ny;

        const colorIdx = Math.floor(Math.abs(x * 3 + y * 2 + t)) % colors.length;
        ctx.fillStyle = colors[colorIdx];
        ctx.fillRect(x * scale, y * scale, 1.2, 1.2);
      }
      ctx.restore();

      a += Math.sin(t * 0.01) * 0.0008;
      b += Math.cos(t * 0.012) * 0.0008;
      t += 0.03;
      requestAnimationFrame(animate);
    }
    `,

    // 2. Quantum Curl Flow Field
    'flow': `
    const numParticles = 600;
    const particles = [];
    let t = 0;

    class StreamParticle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = random(0, width);
        this.y = random(0, height);
        this.prevX = this.x;
        this.prevY = this.y;
        this.speed = random(1.5, 3.5);
        this.color = randomChoice(colors);
        this.life = random(60, 200);
      }
      update() {
        this.prevX = this.x;
        this.prevY = this.y;
        const angle = Math.sin(this.y * 0.005 + t) * Math.PI * 2 + Math.cos(this.x * 0.005 - t) * Math.PI;
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
        this.life--;
        if (this.life <= 0 || this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
          this.reset();
        }
      }
      draw() {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.prevX, this.prevY);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
      }
    }

    function init() {
      ctx.fillStyle = '#07070d';
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < numParticles; i++) particles.push(new StreamParticle());
      animate();
    }

    function animate() {
      ctx.fillStyle = 'rgba(7, 7, 13, 0.03)';
      ctx.fillRect(0, 0, width, height);
      particles.forEach(p => { p.update(); p.draw(); });
      t += 0.004;
      requestAnimationFrame(animate);
    }
    `,

    // 3. Hyperbolic Kaleidoscope Sacred Geometry
    'kaleidoscope': `
    let t = 0;
    const folds = Math.floor(random(6, 12));

    function init() {
      animate();
    }

    function animate() {
      ctx.fillStyle = 'rgba(5, 5, 8, 0.08)';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width / 2, height / 2);

      const angleStep = (Math.PI * 2) / folds;
      for (let fold = 0; fold < folds; fold++) {
        ctx.save();
        ctx.rotate(fold * angleStep + t * 0.01);
        if (fold % 2 === 1) ctx.scale(1, -1);

        for (let r = 50; r < 400; r += 40) {
          const wave = Math.sin(r * 0.03 + t) * 35;
          const color = colors[Math.floor(r * 0.1) % colors.length];

          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(r, wave, 20 + Math.cos(t + r) * 10, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = color;
          ctx.globalAlpha = 0.5;
          ctx.fillRect(r + wave, wave, 6, 6);
        }
        ctx.restore();
      }
      ctx.restore();

      t += 0.02;
      requestAnimationFrame(animate);
    }
    `,

    // 4. Phyllotaxis Spiral Nebula
    'spiral': `
    let n = 0;
    const c = 7;
    const maxPoints = 2500;
    let t = 0;

    function init() {
      ctx.fillStyle = '#040407';
      ctx.fillRect(0, 0, width, height);
      animate();
    }

    function animate() {
      ctx.fillStyle = 'rgba(4, 4, 7, 0.02)';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(t * 0.05);

      const goldenAngle = 137.5 * (Math.PI / 180);
      for (let i = 0; i < 60; i++) {
        const idx = (n + i) % maxPoints;
        const a = idx * goldenAngle + t;
        const r = c * Math.sqrt(idx) + Math.sin(idx * 0.1 + t) * 10;
        const x = r * Math.cos(a);
        const y = r * Math.sin(a);

        const color = colors[idx % colors.length];
        ctx.fillStyle = color;
        ctx.beginPath();
        const size = (1 - (r / (width * 0.5))) * 6 + 1;
        ctx.arc(x, y, Math.max(1, size), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      n = (n + 60) % maxPoints;
      t += 0.015;
      requestAnimationFrame(animate);
    }
    `,

    // 5. Gravitational Singularity Vortex
    'vortex': `
    const count = 400;
    const bodies = [];
    let angle = 0;

    class Body {
      constructor() {
        this.reset();
      }
      reset() {
        this.dist = random(40, width * 0.45);
        this.angle = random(0, Math.PI * 2);
        this.speed = (width * 0.15) / (this.dist + 20);
        this.size = random(1.5, 4.5);
        this.color = randomChoice(colors);
      }
      update() {
        this.angle += this.speed * 0.03;
        this.dist -= 0.15;
        if (this.dist < 20) this.reset();
      }
      draw() {
        const x = width / 2 + Math.cos(this.angle) * this.dist;
        const y = height / 2 + Math.sin(this.angle) * this.dist;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x, y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function init() {
      ctx.fillStyle = '#06060c';
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < count; i++) bodies.push(new Body());
      animate();
    }

    function animate() {
      ctx.fillStyle = 'rgba(6, 6, 12, 0.06)';
      ctx.fillRect(0, 0, width, height);

      bodies.forEach(b => { b.update(); b.draw(); });

      // Core singularity glow
      const grad = ctx.createRadialGradient(width/2, height/2, 5, width/2, height/2, 90);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(0.5, colors[1] || '#ffffff');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(width/2, height/2, 90, 0, Math.PI * 2);
      ctx.fill();

      requestAnimationFrame(animate);
    }
    `,

    // 6. Cybernetic Glitch Lattice
    'glitch': `
    let t = 0;

    function init() {
      animate();
    }

    function animate() {
      ctx.fillStyle = 'rgba(4, 4, 8, 0.08)';
      ctx.fillRect(0, 0, width, height);

      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        for (let y = 0; y < height; y += gridSize) {
          const noiseVal = Math.sin(x * 0.02 + t) * Math.cos(y * 0.02 - t);
          if (noiseVal > 0.4) {
            const color = colors[Math.floor(Math.abs(noiseVal * 10)) % colors.length];
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, gridSize - 4, gridSize - 4);
          } else if (noiseVal < -0.4 && Math.random() > 0.7) {
            ctx.fillStyle = randomChoice(colors);
            ctx.fillRect(x, y + gridSize / 2, gridSize, 3);
          }
        }
      }

      // Digital slice dislocation
      if (Math.random() > 0.8) {
        const sliceY = random(0, height - 60);
        const sliceH = random(10, 50);
        const shiftX = random(-30, 30);
        ctx.drawImage(canvas, 0, sliceY, width, sliceH, shiftX, sliceY, width, sliceH);
      }

      t += 0.03;
      requestAnimationFrame(animate);
    }
    `,

    // 7. Morphing Julia/Lyapunov Complex Fractal
    'fractal': `
    let frame = 0;

    function init() {
      animate();
    }

    function animate() {
      ctx.fillStyle = 'rgba(5, 5, 8, 0.08)';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width / 2, height / 2);

      const branches = 6;
      const angle = (Math.PI * 2) / branches;

      function drawBranch(len, depth, maxDepth) {
        if (depth > maxDepth) return;
        const color = colors[depth % colors.length];
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, (maxDepth - depth) * 1.5);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -len);
        ctx.stroke();

        ctx.save();
        ctx.translate(0, -len);

        const sway = Math.sin(frame * 0.02 + depth) * 0.4;
        ctx.save();
        ctx.rotate(0.5 + sway);
        drawBranch(len * 0.72, depth + 1, maxDepth);
        ctx.restore();

        ctx.save();
        ctx.rotate(-0.5 + sway);
        drawBranch(len * 0.72, depth + 1, maxDepth);
        ctx.restore();

        ctx.restore();
      }

      for (let i = 0; i < branches; i++) {
        ctx.save();
        ctx.rotate(i * angle + frame * 0.005);
        drawBranch(120, 0, 6);
        ctx.restore();
      }

      ctx.restore();
      frame++;
      requestAnimationFrame(animate);
    }
    `,

    // 8. Dynamic Voronoi Tessellation & Polygonal Shards
    'abstract': `
    const nodes = [];
    const numNodes = 40;
    let t = 0;

    class CrystalNode {
      constructor() {
        this.x = random(50, width - 50);
        this.y = random(50, height - 50);
        this.vx = random(-1, 1);
        this.vy = random(-1, 1);
        this.color = randomChoice(colors);
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 50 || this.x > width - 50) this.vx *= -1;
        if (this.y < 50 || this.y > height - 50) this.vy *= -1;
      }
    }

    function init() {
      for (let i = 0; i < numNodes; i++) nodes.push(new CrystalNode());
      animate();
    }

    function animate() {
      ctx.fillStyle = 'rgba(6, 6, 10, 0.1)';
      ctx.fillRect(0, 0, width, height);

      nodes.forEach(n => n.update());

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 180) {
            ctx.strokeStyle = nodes[i].color;
            ctx.globalAlpha = 1 - (dist / 180);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      nodes.forEach(n => {
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      t += 0.01;
      requestAnimationFrame(animate);
    }
    `
  };

  const techLower = technique.toLowerCase();
  let key = Object.keys(code).find(k => techLower.includes(k));

  if (!key) {
    if (techLower.includes('attractor') || techLower.includes('clifford')) key = 'attractor';
    else if (techLower.includes('kaleidoscope') || techLower.includes('hyperbolic') || techLower.includes('sacred') || techLower.includes('mandala')) key = 'kaleidoscope';
    else if (techLower.includes('spiral') || techLower.includes('phyllotaxis')) key = 'spiral';
    else if (techLower.includes('flow') || techLower.includes('noise') || techLower.includes('perlin') || techLower.includes('quantum')) key = 'flow';
    else if (techLower.includes('vortex') || techLower.includes('singularity') || techLower.includes('particle')) key = 'vortex';
    else if (techLower.includes('fractal')) key = 'fractal';
    else if (techLower.includes('glitch') || techLower.includes('lattice')) key = 'glitch';
    else {
      // Pick randomly so unknown techniques get varied, dynamic generative art
      const keys = Object.keys(code);
      key = keys[Math.floor(Math.random() * keys.length)];
    }
  }

  return code[key] || code['attractor'];
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
  let concept;
  
  if (!fs.existsSync(CONCEPT_FILE)) {
    console.log('⚠️  No concept file found, using default creative fallback...');
    const fallbackTechniques = [
      'Clifford Strange Attractor',
      'Hyperbolic Kaleidoscope',
      'Quantum Flow Field',
      'Phyllotaxis Spiral Matrix',
      'Particle Singularity Vortex',
      'Cybernetic Glitch Lattice'
    ];
    const fallbackColors = [
      ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff'],
      ['#00d2d3', '#ff9f43', '#ee5a24', '#0abde3', '#10ac84'],
      ['#5f27cd', '#341f97', '#2e86de', '#ff6348', '#2ed573'],
      ['#e056fd', '#686de0', '#30336b', '#f9ca24', '#badc58']
    ];
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    concept = {
      title: 'Emergent Depths',
      concept: 'An autonomous exploration of chaotic beauty, evolving forms, and computational emergence.',
      technique: pick(fallbackTechniques),
      colors: pick(fallbackColors),
      interaction: 'Animated',
      tone: 'Mysterious and alive',
      generated: 'fallback',
      customCode: null
    };
  } else {
    concept = JSON.parse(fs.readFileSync(CONCEPT_FILE, 'utf8'));
    console.log('🎨 Generating art for:', concept.title);
    console.log('   Technique:', concept.technique);
    console.log('   Colors:', concept.colors?.join(', '));
    console.log('   Has Custom AI Code:', !!concept.customCode);
  }

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

module.exports = { generateArt, generateCanvasArt, generateHTML };
