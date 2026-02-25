#!/usr/bin/env node

/**
 * Concept Selector for autonomousART
 * Selects next art concept using AI or fallback modes
 */

const fs = require('fs');
const path = require('path');
const { checkForDuplicates } = require('./check-duplicates');
const { shouldBeMoodBased, getSentimentConcept } = require('./trend-sentiment');

const CONCEPT_FILE = path.join(__dirname, '..', 'selected-concept.json');
const HISTORY_FILE = path.join(__dirname, '..', 'concept-history.json');
const PROMPT_FILE = path.join(__dirname, '..', 'prompts', 'art-generation.txt');

// Fallback concepts for when no API is available
const FALLBACK_CONCEPTS = [
  {
    title: "Recursive Spirals",
    concept: "Mathematical spirals recursively nested at different scales, creating a hypnotic tunnel effect with perspective zoom.",
    technique: "Fractal Geometry",
    colors: ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
    interaction: "Mouse-interactive",
    tone: "Hypnotic and meditative"
  },
  {
    title: "Particle Entropy",
    concept: "Thousands of particles flowing through an invisible force field, creating emergent patterns that decay and reform.",
    technique: "Particle Dynamics",
    colors: ["#0d0221", "#3c096c", "#5a189a", "#9d4edd"],
    interaction: "Animated",
    tone: "Chaotic yet harmonious"
  },
  {
    title: "Perlin Dream",
    concept: "Flowing landscape made of Perlin noise, morphing smoothly through color space, creating organic biological forms.",
    technique: "Perlin Noise Landscapes",
    colors: ["#264653", "#2a9d8f", "#e9c46a", "#f4a261"],
    interaction: "Time-based",
    tone: "Peaceful and dreamy"
  },
  {
    title: "Geometric Genesis",
    concept: "Procedurally generated geometric patterns that grow and multiply, creating intricate mandala-like symmetries.",
    technique: "Generative Geometry",
    colors: ["#001d3d", "#003566", "#ffc300", "#ffd60a"],
    interaction: "Static",
    tone: "Sacred and mathematical"
  },
  {
    title: "Cellular Awakening",
    concept: "Conway's Game of Life variant where cells bloom into colorful regions, creating evolution in real-time.",
    technique: "Cellular Automata",
    colors: ["#240046", "#5a189a", "#9d4edd", "#00f5ff"],
    interaction: "Time-based",
    tone: "Mysterious and alive"
  },
  {
    title: "Chromatic Waves",
    concept: "Waves of color flowing and interfering with each other, creating patterns of harmony and dissonance.",
    technique: "Color Theory",
    colors: ["#000000", "#ff006e", "#ffbe0b", "#8338ec"],
    interaction: "Mouse-interactive",
    tone: "Energetic and vibrant"
  },
  {
    title: "Gravity Wells",
    concept: "Objects orbiting invisible gravity points, creating complex dance patterns with trails of light.",
    technique: "Interactive Physics",
    colors: ["#0a0e27", "#1a1f3a", "#ff006e", "#00d4ff"],
    interaction: "Animated",
    tone: "Cosmic and transcendent"
  },
  {
    title: "Chaos Fractals",
    concept: "Zooming infinitely into Mandelbrot territory, revealing infinite detail and self-similarity at every scale.",
    technique: "Fractal Mathematics",
    colors: ["#000428", "#004e89", "#f77f00", "#fcbf49"],
    interaction: "Static",
    tone: "Mind-bending complexity"
  },
  {
    title: "Bloom Effect",
    concept: "Particles bloom and dissipate in a field, like flowers blooming in timelapse, creating a garden of light.",
    technique: "Particle Dynamics",
    colors: ["#03071e", "#370617", "#e63946", "#f1faee"],
    interaction: "Time-based",
    tone: "Beautiful and poetic"
  },
  {
    title: "Vector Flow",
    concept: "Visualization of invisible vector fields showing flow and curl, with particles tracing the paths.",
    technique: "Interactive Physics",
    colors: ["#0b0014", "#2d0a4e", "#7209b7", "#00f5ff"],
    interaction: "Mouse-interactive",
    tone: "Intricate and subtle"
  }
];

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return null;
  }
  
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  
  try {
    const response = await fetch(`${url}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 2048
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    
  } catch (error) {
    console.error('Gemini API failed:', error.message);
    return null;
  }
}

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

function getRandomConcept(exclude = []) {
  const available = FALLBACK_CONCEPTS.filter(c => !exclude.includes(c.title));
  
  if (available.length === 0) {
    return FALLBACK_CONCEPTS[Math.floor(Math.random() * FALLBACK_CONCEPTS.length)];
  }
  
  return available[Math.floor(Math.random() * available.length)];
}

async function selectConcept() {
  console.log('🎨 Selecting art concept...\n');
  
  // Check if today's art should be mood-based
  const isMoodBased = shouldBeMoodBased();
  if (isMoodBased) {
    console.log('🌍 Today\'s art will be based on trending sentiment/mood');
  }
  
  // Load prompt
  let prompt = '';
  if (fs.existsSync(PROMPT_FILE)) {
    prompt = fs.readFileSync(PROMPT_FILE, 'utf8');
  }
  
  // Try to get AI-generated concept
  let concept = null;
  let attempts = 0;
  const maxAttempts = 3;
  
  while (!concept && attempts < maxAttempts) {
    attempts++;
    
    if (process.env.GEMINI_API_KEY) {
      console.log(`📡 Calling Gemini API for concept (attempt ${attempts}/${maxAttempts})...`);
      const aiResponse = await callGemini(prompt);
      if (aiResponse) {
        try {
          concept = parseAIResponse(aiResponse);
          
          // Check for duplicates
          const dupCheck = checkForDuplicates(concept.title);
          if (dupCheck.hasDuplicate) {
            console.log('⚠️  Similar concept detected. Trying again...');
            console.log(`   Similar to: ${dupCheck.similar[0].file} (${dupCheck.similar[0].matchRatio}% match)`);
            concept = null; // Retry
          }
        } catch (error) {
          console.log('⚠️  Failed to parse AI response, retrying...');
        }
      }
    }
  }
  
  // Fall back to random selection
  if (!concept) {
    console.log('💭 Using fallback concept selection...');
    
    // Use mood-based fallback if applicable
    if (isMoodBased) {
      console.log('📊 Using sentiment-based fallback...');
      concept = getSentimentConcept();
    } else {
      // Random fallback
      const history = getConceptHistory();
      const recentTitles = history.slice(-10).map(c => c.title);
      
      // Keep trying until we find a unique concept
      let uniqueConcept = null;
      let fallbackAttempts = 0;
      while (!uniqueConcept && fallbackAttempts < 5) {
        const candidate = getRandomConcept(recentTitles);
        const dupCheck = checkForDuplicates(candidate.title);
        if (!dupCheck.hasDuplicate) {
          uniqueConcept = candidate;
        }
        fallbackAttempts++;
      }
      concept = uniqueConcept || getRandomConcept(recentTitles);
    }
  }
  
  // Save selected concept
  fs.writeFileSync(CONCEPT_FILE, JSON.stringify(concept, null, 2));
  
  console.log('\n✅ Concept selected:');
  console.log(`   Title: ${concept.title}`);
  console.log(`   Technique: ${concept.technique}`);
  console.log(`   Tone: ${concept.tone}`);
  if (concept.isMoodBased) {
    console.log(`   🌍 Mood-based: ${concept.trend}`);
  }
  
  // Add to history
  const history = getConceptHistory();
  history.push({
    title: concept.title,
    date: new Date().toISOString(),
    technique: concept.technique,
    isMoodBased: concept.isMoodBased || false
  });
  saveConceptHistory(history);
  
  return concept;
}

function parseAIResponse(response) {
  // Simple parser - in production would be more sophisticated
  const titleMatch = response.match(/TITLE:\s*(.+)/);
  const conceptMatch = response.match(/CONCEPT:\s*(.+)/);
  const techniqueMatch = response.match(/TECHNIQUE:\s*(.+)/);
  const colorMatch = response.match(/Color palette[:\s]+([#\w,\s"']+)/i);
  const interactionMatch = response.match(/INTERACTION:\s*-\s*(.+)/);
  const toneMatch = response.match(/EMOTIONAL_TONE:\s*(.+)/);
  
  return {
    title: titleMatch?.[1]?.trim() || 'Untitled Concept',
    concept: conceptMatch?.[1]?.trim() || 'A unique generative art piece',
    technique: techniqueMatch?.[1]?.trim() || 'Generative Geometry',
    colors: parseColors(colorMatch?.[1] || '#1a1a2e,#16213e,#0f3460'),
    interaction: interactionMatch?.[1]?.trim() || 'Animated',
    tone: toneMatch?.[1]?.trim() || 'Thought-provoking'
  };
}

function parseColors(colorString) {
  return colorString
    .split(/[,\s]+/)
    .filter(c => c.match(/^#?[0-9a-f]{6}$/i) || /^[a-z]+$/i.test(c))
    .slice(0, 5);
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
