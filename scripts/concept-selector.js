#!/usr/bin/env node

/**
 * Concept selector powered by Hugging Face GGUF inference (Ollama removed).
 */

const { generateConcept } = require('./concept-generator');

if (require.main === module) {
  generateConcept().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
}

module.exports = { generateConcept };
