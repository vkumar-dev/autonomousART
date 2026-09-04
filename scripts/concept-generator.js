#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const HfInference = require('./hf-inference');

const ROOT = path.join(__dirname, '..');
const CONCEPT_FILE = path.join(ROOT, 'selected-concept.json');
const HISTORY_FILE = path.join(ROOT, 'concept-history.json');

const ART_TECHNIQUES = [
  'Clifford Strange Attractor',
  'Hyperbolic Kaleidoscope',
  'Quantum Flow Field',
  'Phyllotaxis Spiral Matrix',
  'Reaction-Diffusion Labyrinth',
  'Neural Wave Harmonics',
  'Fractal Flame Dynamics',
  'Cybernetic Glitch Lattice',
  'Particle Singularity Vortex',
  'Cellular Automata Topography'
];

const EMOTIONAL_TONES = [
  'Hypnotic and meditative',
  'Chaotic yet harmonious',
  'Peaceful and dreamy',
  'Sacred and mathematical',
  'Mysterious and alive',
  'Energetic and vibrant',
  'Cosmic and transcendent',
  'Mind-bending complexity',
  'Beautiful and poetic',
  'Intricate and subtle',
  'Thought-provoking',
  'Surreal and dreamlike'
];

function getConceptHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    return data.concepts || [];
  } catch {
    return [];
  }
}

function getRecentTechniques(history, count = 10) {
  return history.slice(-count).map(h => h.technique).filter(Boolean);
}

function getDiverseTechnique(history) {
  const recent = getRecentTechniques(history, 10);
  const recentCounts = {};
  recent.forEach(t => { recentCounts[t] = (recentCounts[t] || 0) + 1; });

  const weighted = ART_TECHNIQUES.map(t => {
    const timesUsed = recentCounts[t] || 0;
    return { technique: t, weight: 1 / (1 + timesUsed * 2) };
  });

  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  let r = Math.random() * totalWeight;
  for (const w of weighted) {
    r -= w.weight;
    if (r <= 0) return w.technique;
  }
  return ART_TECHNIQUES[Math.floor(Math.random() * ART_TECHNIQUES.length)];
}

function getRandomTone() {
  return EMOTIONAL_TONES[Math.floor(Math.random() * EMOTIONAL_TONES.length)];
}

function validateJsSyntax(code) {
  if (!code || typeof code !== 'string') return false;
  try {
    new vm.Script(code);
    return true;
  } catch (e) {
    console.warn('⚠️ Generated JavaScript syntax error:', e.message);
    return false;
  }
}

function parseConceptResponse(response, chosenTechnique, chosenTone) {
  console.log('📝 Parsing model response...\n');

  let cleaned = response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  const defaultConcept = {
    title: 'Surreal Vision',
    concept: 'A generative digital abstraction with algorithmic depth and morphing structures.',
    technique: chosenTechnique || 'Quantum Flow Field',
    colors: ['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#53354a'],
    interaction: 'Animated',
    tone: chosenTone || 'Cosmic and transcendent',
    customCode: null
  };

  // 1. Extract JavaScript code block if present
  const codeBlockMatch = cleaned.match(/```(?:javascript|js)?\s*\n([\s\S]*?)\n```/i);
  if (codeBlockMatch) {
    const rawCode = codeBlockMatch[1].trim();
    if (validateJsSyntax(rawCode)) {
      console.log('✅ Extracted and validated AI-generated canvas code');
      defaultConcept.customCode = rawCode;
    } else {
      console.warn('⚠️ Code failed syntax check, will use enhanced procedural fallback');
    }
    // Remove the code block so it doesn't interfere with frontmatter/metadata parsing
    cleaned = cleaned.replace(codeBlockMatch[0], '').trim();
  }

  // 2. Parse Frontmatter metadata
  const fmMatch = cleaned.match(/---\s*\n([\s\S]*?)\n---/);
  const metadataBlock = fmMatch ? fmMatch[1] : cleaned;

  // Try title
  const titleMatch = metadataBlock.match(/^title:\s*["']?(.+?)["']?\s*$/im);
  if (titleMatch) {
    defaultConcept.title = titleMatch[1].replace(/["']/g, '').slice(0, 50).trim();
  }

  // Try concept description
  const conceptMatch = metadataBlock.match(/^concept:\s*["']?(.+?)["']?\s*$/im);
  if (conceptMatch) {
    defaultConcept.concept = conceptMatch[1].replace(/["']/g, '').slice(0, 300).trim();
  }

  // Try technique
  const techMatch = metadataBlock.match(/^technique:\s*["']?(.+?)["']?\s*$/im);
  if (techMatch) {
    defaultConcept.technique = techMatch[1].replace(/["']/g, '').slice(0, 60).trim();
  }

  // Try colors
  const colorsMatch = metadataBlock.match(/colors:\s*\[?(.*?)\]?$/im);
  if (colorsMatch) {
    const foundColors = colorsMatch[1].match(/#[0-9a-fA-F]{3,8}/g);
    if (foundColors && foundColors.length >= 3) {
      defaultConcept.colors = foundColors.slice(0, 5);
    }
  }

  // Try tone
  const toneMatch = metadataBlock.match(/^tone:\s*["']?(.+?)["']?\s*$/im);
  if (toneMatch) {
    defaultConcept.tone = toneMatch[1].replace(/["']/g, '').slice(0, 50).trim();
  }

  // Fallback: If title wasn't found via frontmatter, check for JSON mode output
  if (defaultConcept.title === 'Surreal Vision') {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.title) defaultConcept.title = String(parsed.title).slice(0, 50).trim();
        if (parsed.concept) defaultConcept.concept = String(parsed.concept).slice(0, 300).trim();
        if (parsed.technique) defaultConcept.technique = String(parsed.technique).slice(0, 60).trim();
        if (Array.isArray(parsed.colors)) {
          const valid = parsed.colors.filter(c => typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c));
          if (valid.length >= 3) defaultConcept.colors = valid.slice(0, 5);
        }
        if (parsed.tone) defaultConcept.tone = String(parsed.tone).slice(0, 50).trim();
        if (parsed.code && !defaultConcept.customCode && validateJsSyntax(parsed.code)) {
          defaultConcept.customCode = parsed.code.trim();
        }
      } catch (e) {}
    }
  }

  return defaultConcept;
}

async function generateConcept() {
  console.log('🎨 Generating art concept & canvas code with Hugging Face GGUF model...\n');

  const inference = new HfInference();
  const model = inference.ensureModelSelection();
  console.log(`🤖 Using model: ${model.model} (${model.quantization || 'GGUF'})\n`);

  const previousHistory = getConceptHistory();
  const technique = getDiverseTechnique(previousHistory);
  const tone = getRandomTone();

  const prompt = `You are an elite creative coding artist and generative art director.
Create a unique, visually mesmerizing, and mathematically creative generative artwork for HTML5 Canvas.
Do NOT create simple floating circles or random dots. Think about sacred geometry, strange attractors, reaction-diffusion, hyperbolic lattices, phyllotaxis spirals, kaleidoscopic reflections, neural wave dynamics, or chaotic fluid simulations.

Format your response EXACTLY like this:

---
title: [2-4 word surreal art title]
concept: [1-2 sentences describing the visual evolution, mathematics, and motion]
technique: ${technique}
colors: [#hex1, #hex2, #hex3, #hex4, #hex5]
tone: ${tone}
---

\`\`\`javascript
// Complete creative HTML5 canvas animation or generative drawing.
// Available in scope: canvas, ctx, width (1024), height (1024), colors (array of 5 hex strings), random(min, max), randomChoice(arr).
// Use requestAnimationFrame for smooth animation, or generate an intricate multi-layered composition.
// Start your animation or drawing immediately.
\`\`\`

Response MUST follow this format with frontmatter and a \`\`\`javascript code block.`;

  console.log('📡 Calling local Hugging Face GGUF inference (generating concept & canvas code)...\n');
  const result = inference.generate(prompt, {
    temperature: 0.75,
    maxTokens: 3072,
    system: "You are an elite creative coding artist and generative art director. Output frontmatter and a complete javascript code block for the HTML5 canvas."
  });

  if (!result.success) {
    console.warn(`⚠️ Inference warning: ${result.error}. Using fallback concept.`);
  }

  const concept = parseConceptResponse(result.content || '', technique, tone);
  concept.generated = 'hf-gguf';
  concept.model = model.model || 'hf-model';

  fs.writeFileSync(CONCEPT_FILE, JSON.stringify(concept, null, 2));
  console.log('\n✅ Concept saved to selected-concept.json!');
  console.log(`   Title: ${concept.title}`);
  console.log(`   Technique: ${concept.technique}`);
  console.log(`   Colors: ${concept.colors.join(', ')}`);
  console.log(`   Custom AI Canvas Code: ${concept.customCode ? 'YES (Valid JS)' : 'NO (Using procedural engine)'}`);

  const updatedHistory = getConceptHistory();
  updatedHistory.push({
    title: concept.title,
    date: new Date().toISOString(),
    technique: concept.technique,
    generated: 'hf-gguf',
    model: model.model || 'hf-model',
    hasCustomCode: !!concept.customCode
  });

  fs.writeFileSync(HISTORY_FILE, JSON.stringify({
    concepts: updatedHistory,
    lastUpdated: new Date().toISOString()
  }, null, 2));

  return concept;
}

async function main() {
  try {
    await generateConcept();
    console.log('\n🎨 Ready to generate artwork!');
  } catch (error) {
    console.error('❌ Error generating concept:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateConcept };
