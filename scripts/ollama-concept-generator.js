#!/usr/bin/env node

/**
 * Ollama Concept Generator for autonomousART
 * Uses local Ollama instance to generate unique art concepts
 * NO FALLBACK - Only real AI-generated concepts or failure
 */

const fs = require('fs');
const path = require('path');
const OllamaInference = require('./ollama-inference');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
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
  // Parse Ollama response to extract concept details
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
    // Try to extract title
    const titleMatch = response.match(/title[:\s]+([^\n]+)/i);
    if (titleMatch) concept.title = titleMatch[1].trim().replace(/^["']|["']$/g, '');

    // Try to extract concept description
    const conceptMatch = response.match(/concept[:\s]+([^\n]+(?:\n(?!\w)[^\n]+)*)/i);
    if (conceptMatch) concept.concept = conceptMatch[1].trim().replace(/^["']|["']$/g, '');

    // Try to extract technique if mentioned
    const techniqueMatch = response.match(/technique[:\s]+([^\n]+)/i);
    if (techniqueMatch) {
      const mentioned = techniqueMatch[1].trim();
      if (ART_TECHNIQUES.some(t => mentioned.includes(t))) {
        concept.technique = ART_TECHNIQUES.find(t => mentioned.includes(t));
      }
    }

    // Try to extract colors (looking for hex codes)
    const colorMatches = response.match(/#[0-9a-f]{6}/gi);
    if (colorMatches && colorMatches.length > 0) {
      concept.colors = [...new Set(colorMatches.slice(0, 5))];
    }

    // Extract tone
    const toneMatch = response.match(/tone[:\s]+([^\n]+)/i) || 
                      response.match(/mood[:\s]+([^\n]+)/i) ||
                      response.match(/emotional[:\s]+([^\n]+)/i);
    if (toneMatch) concept.tone = toneMatch[1].trim().replace(/^["']|["']$/g, '');

  } catch (error) {
    console.warn('⚠️  Warning: Could not fully parse response, using defaults');
  }

  return concept;
}

async function generateConceptWithOllama() {
  console.log('🎨 Generating art concept with Ollama...\n');

  const inference = new OllamaInference(OLLAMA_URL, OLLAMA_MODEL);

  // Check if Ollama is available
  console.log('🔍 Checking Ollama availability...');
  const available = await inference.isAvailable();
  if (!available) {
    throw new Error(`❌ CRITICAL: Ollama service is not available at ${OLLAMA_URL}. Cannot generate art without Ollama.`);
  }

  // Check if model exists
  const modelAvailable = await inference.modelExists();
  if (!modelAvailable) {
    throw new Error(`❌ CRITICAL: Model "${OLLAMA_MODEL}" not found in Ollama. Please pull the model first.`);
  }

  // Load prompt template
  let prompt = '';
  if (fs.existsSync(PROMPT_FILE)) {
    prompt = fs.readFileSync(PROMPT_FILE, 'utf8');
  } else {
    // Default prompt
    prompt = `Generate a unique and creative art concept for generative/computational art. 

Include the following in your response:
- Title: [A compelling name for the art piece]
- Concept: [Detailed description of what the art shows, its visual elements, and how it evolves]
- Technique: [One of: Fractal Mathematics, Particle Dynamics, Perlin Noise Landscapes, Generative Geometry, Cellular Automata, Color Theory, Interactive Physics, Abstract Expressionism]
- Colors: [A color palette with 4-5 colors as hex codes]
- Tone: [The emotional tone or mood]
- Interaction: [How the viewer might interact: Static, Time-based, Mouse-interactive, or Animated]

Create something original, visually compelling, and computationally interesting. Focus on mathematical beauty and visual harmony.`;
  }

  // Replace placeholders if any
  const technique = getRandomTechnique();
  const tone = getRandomTone();
  prompt = prompt
    .replace('{{TECHNIQUE}}', technique)
    .replace('{{TONE}}', tone);

  console.log('📝 Prompt:');
  console.log(prompt.substring(0, 200) + '...\n');

  // Generate with Ollama (NO FALLBACK)
  console.log(`📡 Calling Ollama API (model: ${OLLAMA_MODEL})...`);
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

  console.log('\n🔄 Parsing concept...');
  const concept = parseConceptResponse(result.content);

  // Save concept
  fs.writeFileSync(CONCEPT_FILE, JSON.stringify(concept, null, 2));
  console.log('\n✅ Concept saved successfully!');
  console.log(`   Title: ${concept.title}`);
  console.log(`   Technique: ${concept.technique}`);
  console.log(`   Tone: ${concept.tone}`);
  console.log(`   Colors: ${concept.colors.join(', ')}`);

  // Update history
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

// Main execution
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

module.exports = { generateConceptWithOllama, OllamaInference };
