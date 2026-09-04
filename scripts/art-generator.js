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
    // --- AI-GENERATED CANVAS CODE (watchdog-guarded) ---
    (function() {
      // The AI writes arbitrary code, so before trusting its output we probe the
      // real canvas pixels. If the code throws OR leaves the canvas effectively
      // blank after a few animation frames, we stop its loop and run the proven
      // procedural engine instead. This prevents silently-deployed black pages.
      const nativeRaf = (typeof window !== 'undefined' && window.requestAnimationFrame)
        ? window.requestAnimationFrame.bind(window)
        : null;

      const frameQueue = [];
      let scheduled = false;
      let phase = 'probing';   // 'probing' -> 'running' (AI kept) | 'fallback'
      let probeFrames = 0;
      let frameTime = 0;
      const PROBE_FRAMES = 12;

      function schedule() {
        if (scheduled || !nativeRaf) return;
        scheduled = true;
        nativeRaf(flush);
      }

      // Intercept rAF so we can count frames for the probe and, when needed,
      // fully stop the AI animation before the fallback engine starts.
      window.requestAnimationFrame = function(cb) {
        frameQueue.push(cb);
        schedule();
        return 0;
      };
      window.cancelAnimationFrame = function() {};

      function flush() {
        scheduled = false;
        frameTime += 16;
        const cbs = frameQueue.splice(0, frameQueue.length);
        for (let i = 0; i < cbs.length; i++) {
          try { cbs[i](frameTime); } catch (e) { console.error('Animation frame error:', e); }
        }
        if (phase === 'probing') {
          probeFrames++;
          if (probeFrames >= PROBE_FRAMES) decide();
        }
        if (phase === 'probing') {
          if (!scheduled) schedule();
        } else if ((phase === 'running' || phase === 'fallback') && frameQueue.length > 0 && !scheduled) {
          schedule();
        }
      }

      function isCanvasBlank() {
        try {
          const img = ctx.getImageData(0, 0, width, height);
          const d = img.data;
          const step = 32;
          for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
              const i = (y * width + x) * 4;
              // Visible = any non-transparent pixel that is not near-black.
              if (d[i + 3] > 0 && (d[i] + d[i + 1] + d[i + 2]) > 30) return false;
            }
          }
          return true;
        } catch (e) {
          return false; // pixels unreadable (rare); assume the code drew something
        }
      }

      function runFallback(reason) {
        console.log('Falling back to procedural engine (' + reason + ')...');
        phase = 'fallback';
        frameQueue.length = 0; // halt the AI animation loop
        ctx.clearRect(0, 0, width, height);
        // Own scope: declarations can never collide with the AI code's names
        // (a collision would be a parse-time SyntaxError no try/catch can catch).
        (function() {
          ${getArtCode(technique, colors, concept)}
          if (typeof init === 'function') {
            init();
          }
        })();
        if (frameQueue.length > 0 && !scheduled) schedule();
      }

      function decide() {
        if (isCanvasBlank()) {
          runFallback('AI code left the canvas blank');
        } else {
          phase = 'running';
        }
      }

      let customSucceeded = false;
      try {
        // Run the AI code in its own scope so its top-level declarations can
        // never collide with the watchdog's own identifiers.
        (function() {
          ${concept.customCode}
          if (typeof init === 'function') {
            init();
          }
        })();
        customSucceeded = true;
      } catch (err) {
        console.error('Custom AI art execution error:', err);
      }

      if (!customSucceeded) {
        runFallback('AI code threw an error');
      } else if (frameQueue.length === 0) {
        // No animation requested: judge the synchronous drawing right away.
        if (isCanvasBlank()) runFallback('AI code left the canvas blank');
        else phase = 'running';
      } else if (!nativeRaf) {
        phase = 'running'; // can't probe without rAF; keep whatever ran
      } else {
        schedule(); // animate, then probe the pixels after a few frames
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
    :root {
      --paper: #f2eee6;
      --ink: #1b1814;
      --ink-soft: #56504a;
      --ink-faint: #938c81;
      --line: rgba(27, 24, 20, 0.14);
      --serif: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif;
      --sans: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Segoe UI', Arial, sans-serif;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
    body {
      background: var(--paper);
      color: var(--ink);
      font-family: var(--sans);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      padding: 44px 26px 90px;
    }
    .page { width: 100%; max-width: 780px; }
    .work { width: 100%; }
    .plate {
      position: relative;
      width: 100%;
      background: #0f0f0d;
      line-height: 0;
      box-shadow: 0 1px 2px rgba(27,24,20,0.04), 0 40px 90px -48px rgba(27,24,20,0.5);
    }
    canvas { width: 100%; height: auto; display: block; }
    .caption { padding-top: 26px; }
    .kicker {
      font-size: 10px;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: var(--ink-faint);
      margin-bottom: 16px;
    }
    h1 {
      font-family: var(--serif);
      font-weight: 400;
      font-size: clamp(25px, 5vw, 36px);
      line-height: 1.1;
      letter-spacing: -0.01em;
      margin-bottom: 16px;
    }
    .desc {
      font-family: var(--serif);
      font-size: 15px;
      line-height: 1.7;
      color: var(--ink-soft);
      max-width: 62ch;
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px 26px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--line);
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--ink-soft);
    }
    .palette { display: inline-flex; gap: 7px; align-items: center; }
    .palette i {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      border: 1px solid rgba(27,24,20,0.16);
    }
    .back {
      display: inline-block;
      margin-top: 40px;
      font-size: 10.5px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      text-decoration: none;
      color: var(--ink);
      border-bottom: 1px solid var(--line);
      padding-bottom: 4px;
      transition: border-color 0.4s ease;
    }
    .back:hover { border-color: var(--ink); }

    /* #stage: frame-only mode used when the piece is embedded (thumbnails, viewing room) */
    html.stage body { padding: 0; display: block; }
    html.stage .page {
      width: 100%;
      max-width: none;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    html.stage .work { width: min(100vw, 100vh); }
    html.stage .plate { width: 100%; box-shadow: none; }
    html.stage .caption,
    html.stage .back { display: none; }

    @media (prefers-reduced-motion: reduce) {
      * { transition: none !important; }
    }
  </style>
  <script>
    if (location.hash === '#stage') document.documentElement.classList.add('stage');
  </script>
</head>
<body>
  <div class="page">
    <figure class="work">
      <div class="plate">
        <canvas id="artCanvas" width="1024" height="1024"></canvas>
      </div>
      <figcaption class="caption">
        <p class="kicker" id="artAccession">Autonomous Art &middot; Generative</p>
        <h1>${concept.title}</h1>
        <p class="desc">${concept.concept || 'A generative artwork composed by an autonomous system.'}</p>
        <div class="meta-row">
          <span>${concept.technique || 'Generative Art'}</span>
          <span>${concept.interaction || 'Animated'}</span>
          <span class="palette">${colors.slice(0, 5).map(c => `<i style="background:${c}"></i>`).join('')}</span>
        </div>
      </figcaption>
    </figure>
    <a class="back" href="../../../../index.html">&larr; Return to collection</a>
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

    // Accession caption: derive the display date from this file's timestamp.
    try {
      const m = /([0-9]{8})-([0-9]{6})-([^/]+)[.]html$/.exec(location.pathname);
      if (m) {
        const d = new Date(+m[1].slice(0, 4), +m[1].slice(4, 6) - 1, +m[1].slice(6, 8));
        const el = document.getElementById('artAccession');
        if (el) el.textContent = 'Autonomous Art · ' + d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
      }
    } catch (e) {}
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
