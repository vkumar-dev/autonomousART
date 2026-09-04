#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const HfInference = require('./hf-inference');

const ROOT = path.join(__dirname, '..');
const CONCEPT_FILE = path.join(ROOT, 'selected-concept.json');
const HISTORY_FILE = path.join(ROOT, 'concept-history.json');
const MODEL_FILE = path.join(ROOT, 'selected-model.json');

const ART_TECHNIQUES = [
  'Fractal Mathematics',
  'Particle Dynamics',
  'Perlin Noise Landscapes',
  'Generative Geometry',
  'Cellular Automata',
  'Color Theory',
  'Interactive Physics',
  'Abstract Expressionism'
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

function parseConceptResponse(response, chosenTechnique, chosenTone) {
  console.log('📝 Parsing model response...\n');

  let cleaned = response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Strip markdown code fences if present
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  const defaultConcept = {
    title: 'Surreal Vision',
    concept: 'A generative digital abstraction with algorithmic depth and morphing structures.',
    technique: chosenTechnique || 'Fractal Mathematics',
    colors: ['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#53354a'],
    interaction: 'Animated',
    tone: chosenTone || 'Cosmic and transcendent'
  };

  try {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.title) defaultConcept.title = String(parsed.title).slice(0, 50).trim();
      if (parsed.concept) defaultConcept.concept = String(parsed.concept).slice(0, 300).trim();
      if (parsed.technique) {
        const text = String(parsed.technique).toLowerCase();
        const found = ART_TECHNIQUES.find(t => text.includes(t.toLowerCase()));
        if (found) {
          defaultConcept.technique = found;
        } else {
          const words = text.split(/\s+/);
          const fuzzy = ART_TECHNIQUES.find(t => {
            const tWords = t.toLowerCase().split(/\s+/);
            return tWords.some(tw => words.some(w => w.includes(tw) || tw.includes(w)));
          });
          if (fuzzy) defaultConcept.technique = fuzzy;
        }
      }
      if (Array.isArray(parsed.colors) && parsed.colors.length > 0) {
        const validColors = parsed.colors.filter(c => typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c));
        if (validColors.length > 0) defaultConcept.colors = validColors.slice(0, 5);
      }
      if (parsed.tone) {
        const text = String(parsed.tone).toLowerCase();
        const found = EMOTIONAL_TONES.find(t => text.includes(t.toLowerCase()));
        if (found) defaultConcept.tone = found;
      }
      console.log('✅ Successfully parsed JSON response');
    } else {
      console.warn('⚠️ No JSON found in response, falling back to regex parsing');
      const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
      lines.forEach(line => {
        const titleMatch = line.match(/^title:\s*(.+)$/i);
        if (titleMatch) defaultConcept.title = titleMatch[1].trim().replace(/^["']|["']$/g, '').slice(0, 50);
        const techniqueMatch = line.match(/^technique:\s*(.+)$/i);
        if (techniqueMatch) {
          const found = ART_TECHNIQUES.find(t => techniqueMatch[1].toLowerCase().includes(t.toLowerCase()));
          if (found) defaultConcept.technique = found;
        }
      });
    }
  } catch (error) {
    console.error('❌ Parse error:', error.message);
  }

  return defaultConcept;
}

async function generateConcept() {
  console.log('🎨 Generating art concept with Hugging Face GGUF model...\n');

  const inference = new HfInference();
  const model = inference.ensureModelSelection();
  console.log(`🤖 Using model: ${model.model} (${model.quantization || 'GGUF'})\n`);

  const previousHistory = getConceptHistory();
  const technique = getDiverseTechnique(previousHistory);
  const tone = getRandomTone();

  const prompt = `You are an art concept generator specializing in SURREAL, UNHINGED, and EXPERIMENTAL generative art.
Your goal is to push the boundaries of computational beauty into the realm of the bizarre and the chaotic.

Create ONE concept for a generative artwork.
Return ONLY a JSON object in this exact format:
{
  "title": "2-4 word surreal name",
  "concept": "1-2 sentences describing bizarre visual elements and chaotic evolution",
  "technique": "${technique}",
  "colors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "tone": "${tone}"
}

Available techniques: ${ART_TECHNIQUES.join(', ')}
Available tones: ${EMOTIONAL_TONES.join(', ')}

Think outside the box. Avoid harmony; embrace chaos.
Response MUST be valid JSON.`;

  console.log('📡 Calling local Hugging Face GGUF inference...\n');
  const result = inference.generate(prompt, {
    temperature: 0.7,
    maxTokens: 1024
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

  const updatedHistory = getConceptHistory();
  updatedHistory.push({
    title: concept.title,
    date: new Date().toISOString(),
    technique: concept.technique,
    generated: 'hf-gguf',
    model: model.model || 'hf-model'
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
