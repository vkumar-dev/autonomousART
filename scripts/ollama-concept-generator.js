#!/usr/bin/env node

/**
 * Ollama Concept Generator for autonomousART
 * Uses local Ollama instance to generate unique art concepts
 */

const fs = require('fs');
const path = require('path');
const OllamaInference = require('./ollama-inference');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const CONCEPT_FILE = path.join(__dirname, '..', 'selected-concept.json');
const PROMPT_FILE = path.join(__dirname, '..', 'prompts', 'art-generation.txt');
const HISTORY_FILE = path.join(__dirname, '..', 'concept-history.json');

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
  if (!fs.existsSync(HISTORY_FILE)) {
    return [];
  }
  try {
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    return data.concepts || [];
  } catch {
    return [];
  }
}

function getRandomTechnique() {
  return ART_TECHNIQUES[Math.floor(Math.random() * ART_TECHNIQUES.length)];
}

function getRandomTone() {
  return EMOTIONAL_TONES[Math.floor(Math.random() * EMOTIONAL_TONES.length)];
}

function parseConceptResponse(response) {
  console.log('📝 Parsing Ollama response...\n');

  const concept = {
    title: 'Untitled Concept',
    concept: 'A unique generative art piece',
    technique: getRandomTechnique(),
    colors: ['#1a1a2e', '#16213e', '#0f3460', '#e94560'],
    interaction: 'Animated',
    tone: getRandomTone(),
    generated: 'ollama'
  };

  try {
    const lines = response.split('\n').map(l => l.trim()).filter(l => l);

    lines.forEach(line => {
      const titleMatch = line.match(/^Title:\s*(.+)$/i);
      if (titleMatch) {
        concept.title = titleMatch[1].trim().replace(/^["']|["']$/g, '').slice(0, 50);
        console.log(`✓ Title: ${concept.title}`);
      }

      const conceptMatch = line.match(/^Concept:\s*(.+)$/i);
      if (conceptMatch) {
        concept.concept = conceptMatch[1].trim().replace(/^["']|["']$/g, '').slice(0, 300);
      }

      const techniqueMatch = line.match(/^Technique:\s*(.+)$/i);
      if (techniqueMatch) {
        const mentioned = techniqueMatch[1].trim();
        const foundTechnique = ART_TECHNIQUES.find(t => mentioned.toLowerCase().includes(t.toLowerCase()));
        if (foundTechnique) {
          concept.technique = foundTechnique;
          console.log(`✓ Technique: ${concept.technique}`);
        }
      }

      if (line.match(/^Colors:/i)) {
        const colorMatches = line.match(/#[0-9a-fA-F]{3,6}/g);
        if (colorMatches && colorMatches.length > 0) {
          concept.colors = [...new Set(colorMatches.slice(0, 5))];
          console.log(`✓ Colors: ${concept.colors.join(', ')}`);
        }
      }

      const toneMatch = line.match(/^Tone:\s*(.+)$/i);
      if (toneMatch) {
        const mentioned = toneMatch[1].trim();
        const foundTone = EMOTIONAL_TONES.find(t => mentioned.toLowerCase().includes(t.toLowerCase()));
        if (foundTone) {
          concept.tone = foundTone;
          console.log(`✓ Tone: ${concept.tone}`);
        }
      }
    });

  } catch (error) {
    console.error('❌ Parse error:', error.message);
  }

  return concept;
}

async function generateConceptWithOllama() {
  console.log('🎨 Generating art concept with Ollama...\n');

  const inference = new OllamaInference(OLLAMA_URL, OLLAMA_MODEL);

  console.log('🔍 Checking Ollama availability...');
  const available = await inference.isAvailable();
  if (!available) {
    throw new Error(`❌ Ollama service is not available at ${OLLAMA_URL}`);
  }

  let prompt = '';
  if (fs.existsSync(PROMPT_FILE)) {
    prompt = fs.readFileSync(PROMPT_FILE, 'utf8');
  } else {
    prompt = `You are an art concept generator. Create ONE art concept in this exact format:

Title: [2-4 word name]
Concept: [1-2 sentences describing the visual artwork]
Technique: [Pick one: Fractal Mathematics, Particle Dynamics, Perlin Noise Landscapes, Generative Geometry, Cellular Automata, Color Theory, Interactive Physics, Abstract Expressionism]
Colors: #1a1a2e #16213e #0f3460 #e94560
Tone: [Pick one: Hypnotic, Chaotic, Peaceful, Sacred, Mysterious, Energetic, Cosmic, Complex, Beautiful, Intricate, Thought-provoking, Surreal]

Only respond with these 5 lines, nothing else.`;
  }

  const technique = getRandomTechnique();
  const tone = getRandomTone();
  prompt = prompt.replace('{{TECHNIQUE}}', technique).replace('{{TONE}}', tone);

  console.log(`📡 Calling Ollama (model: ${OLLAMA_MODEL})...\n`);
  const result = await inference.generate(prompt, {
    temperature: 0.8,
    topP: 0.9,
    topK: 40,
    numPredict: 1500,
    verbose: true
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to generate concept with Ollama');
  }

  const concept = parseConceptResponse(result.content);

  fs.writeFileSync(CONCEPT_FILE, JSON.stringify(concept, null, 2));
  console.log('\n✅ Concept saved!');
  console.log(`   Title: ${concept.title}`);
  console.log(`   Technique: ${concept.technique}`);

  const history = getConceptHistory();
  history.push({
    title: concept.title,
    date: new Date().toISOString(),
    technique: concept.technique,
    generated: 'ollama'
  });

  fs.writeFileSync(HISTORY_FILE, JSON.stringify({
    concepts: history,
    lastUpdated: new Date().toISOString()
  }, null, 2));

  return concept;
}

async function main() {
  try {
    await generateConceptWithOllama();
    console.log('\n🎨 Ready to generate artwork!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateConceptWithOllama };
