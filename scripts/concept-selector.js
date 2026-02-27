#!/usr/bin/env node

/**
 * Concept Selector for autonomousART
 * Selects next art concept using Ollama (local LLM) - NO FALLBACKS
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { checkForDuplicates } = require('./check-duplicates');
const { shouldBeMoodBased, getSentimentConcept } = require('./trend-sentiment');

const CONCEPT_FILE = path.join(__dirname, '..', 'selected-concept.json');
const HISTORY_FILE = path.join(__dirname, '..', 'concept-history.json');
const PROMPT_FILE = path.join(__dirname, '..', 'prompts', 'art-generation.txt');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

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

function saveConceptHistory(concepts) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify({
    concepts,
    lastUpdated: new Date().toISOString()
  }, null, 2));
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

async function callOllama(prompt) {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.8,
          top_p: 0.9,
          top_k: 40,
          num_predict: 1500
        }
      }),
      timeout: 600000 // 10 minutes
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.response) {
      throw new Error('Empty response from Ollama');
    }

    return {
      success: true,
      content: data.response,
      model: data.model,
      tokens: data.eval_count || 0
    };
  } catch (error) {
    console.error('❌ Ollama generation failed:', error.message);
    throw error;
  }
}

async function selectConcept() {
  console.log('🎨 Selecting art concept with Ollama...\n');
  
  // Check if Ollama is available
  console.log(`🔍 Checking Ollama availability at ${OLLAMA_URL}...`);
  try {
    const checkResponse = await fetch(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
    if (!checkResponse.ok) {
      throw new Error('Ollama API returned error');
    }
  } catch (error) {
    throw new Error(`❌ CRITICAL: Ollama is not available at ${OLLAMA_URL}. Cannot generate art without Ollama. Error: ${error.message}`);
  }

  // Check if today's art should be mood-based
  const isMoodBased = shouldBeMoodBased();
  if (isMoodBased) {
    console.log('🌍 Today\'s art will be based on trending sentiment/mood\n');
  }

  // Load prompt
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

  const technique = getRandomTechnique();
  const tone = getRandomTone();
  prompt = prompt
    .replace('{{TECHNIQUE}}', technique)
    .replace('{{TONE}}', tone);

  console.log('📝 Prompt:');
  console.log(prompt.substring(0, 200) + '...\n');

  // Generate with Ollama
  console.log(`📡 Calling Ollama API (model: ${OLLAMA_MODEL})...`);
  const result = await callOllama(prompt);

  if (!result.success) {
    throw new Error(result.error || 'Failed to generate concept with Ollama');
  }

  console.log('\n🔄 Parsing concept...');
  let concept = parseConceptResponse(result.content);

  // Check for duplicates
  const dupCheck = checkForDuplicates(concept.title);
  if (dupCheck.hasDuplicate) {
    console.log('⚠️  Similar concept detected, retrying...');
    console.log(`   Similar to: ${dupCheck.similar[0].file} (${dupCheck.similar[0].matchRatio}% match)`);
    throw new Error('Generated concept is too similar to existing artwork. Retry to generate different concept.');
  }

  // Save selected concept
  fs.writeFileSync(CONCEPT_FILE, JSON.stringify(concept, null, 2));

  console.log('\n✅ Concept selected:');
  console.log(`   Title: ${concept.title}`);
  console.log(`   Technique: ${concept.technique}`);
  console.log(`   Tone: ${concept.tone}`);

  // Add to history
  const history = getConceptHistory();
  history.push({
    title: concept.title,
    date: new Date().toISOString(),
    technique: concept.technique,
    generated: 'ollama'
  });
  saveConceptHistory(history);

  return concept;
}

// Main
async function main() {
  try {
    await selectConcept();
  } catch (error) {
    console.error('❌ Error selecting concept:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { selectConcept, getConceptHistory };
