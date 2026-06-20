#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const OllamaInference = require('./ollama-inference');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:3b';
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

  // Weight techniques: penalize recently used ones
  const weighted = ART_TECHNIQUES.map(t => {
    const timesUsed = recentCounts[t] || 0;
    return { technique: t, weight: 1 / (1 + timesUsed * 2) };
  });

  // Weighted random selection
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

function parseConceptResponse(response) {
  console.log('📝 Parsing Ollama response...\n');

  // Default concept in case of failure
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
    // Try to find JSON in the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (parsed.title) concept.title = parsed.title.slice(0, 50);
      if (parsed.concept) concept.concept = parsed.concept.slice(0, 300);
      if (parsed.technique) {
        // Check if any known technique name appears within the Ollama response
        const ollamaText = parsed.technique.toLowerCase();
        const found = ART_TECHNIQUES.find(t => ollamaText.includes(t.toLowerCase()));
        if (found) {
          concept.technique = found;
        } else {
          // Fuzzy: check individual words in the technique name
          const words = ollamaText.split(/\s+/);
          const fuzzy = ART_TECHNIQUES.find(t => {
            const tWords = t.toLowerCase().split(/\s+/);
            return tWords.some(tw => words.some(w => w.includes(tw) || tw.includes(w)));
          });
          if (fuzzy) concept.technique = fuzzy;
        }
      }
      if (Array.isArray(parsed.colors)) {
        concept.colors = parsed.colors.filter(c => /^#[0-9a-fA-F]{3,6}$/.test(c)).slice(0, 5);
      }
      if (parsed.tone) {
        const found = EMOTIONAL_TONES.find(t => parsed.tone.toLowerCase().includes(t.toLowerCase()));
        if (found) concept.tone = found;
      }
      
      console.log('✅ Successfully parsed JSON response');
    } else {
      console.warn('⚠️ No JSON found in response, falling back to regex parsing');
      // Fallback to legacy regex parsing if JSON fails
      const lines = response.split('\n').map(l => l.trim()).filter(l => l);
      lines.forEach(line => {
        const titleMatch = line.match(/^Title:\s*(.+)$/i);
        if (titleMatch) concept.title = titleMatch[1].trim().replace(/^["']|["']$/g, '').slice(0, 50);
        
        const techniqueMatch = line.match(/^Technique:\s*(.+)$/i);
        if (techniqueMatch) {
          const found = ART_TECHNIQUES.find(t => techniqueMatch[1].toLowerCase().includes(t.toLowerCase()));
          if (found) concept.technique = found;
        }
      });
    }
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

  console.log(`📡 Calling Ollama (model: ${OLLAMA_MODEL})...\n`);
  const result = await inference.generate(prompt, {
    temperature: 0.7,
    format: 'json',
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

  const updatedHistory = getConceptHistory();
  updatedHistory.push({
    title: concept.title,
    date: new Date().toISOString(),
    technique: concept.technique,
    generated: 'ollama'
  });

  fs.writeFileSync(HISTORY_FILE, JSON.stringify({
    concepts: updatedHistory,
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
