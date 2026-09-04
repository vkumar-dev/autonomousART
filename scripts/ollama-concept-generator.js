#!/usr/bin/env node

/**
 * Backwards compatibility alias for scripts/concept-generator.js.
 * Uses Hugging Face GGUF inference (Ollama removed).
 */

const { generateConcept } = require('./concept-generator');

if (require.main === module) {
  generateConcept().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
}

module.exports = {
  generateConceptWithOllama: generateConcept,
  generateConcept
};
