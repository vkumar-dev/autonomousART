#!/usr/bin/env node

/**
 * Check for Duplicate/Similar Art Concepts
 * Uses grep to search existing artworks for similar concepts
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ARTWORKS_DIR = path.join(__dirname, '..', 'artworks');

/**
 * Extract keywords from concept
 */
function extractKeywords(concept) {
  // Remove common words and extract meaningful keywords
  const stopwords = ['a', 'the', 'and', 'or', 'in', 'to', 'with', 'of', 'from', 'is', 'are', 'be', 'this', 'that'];
  
  const words = concept
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopwords.includes(w));
  
  return [...new Set(words)].slice(0, 5); // Top 5 unique keywords
}

/**
 * Check if similar concept already exists
 */
function checkForDuplicates(concept) {
  if (!fs.existsSync(ARTWORKS_DIR)) {
    return { hasDuplicate: false, similar: [] };
  }
  
  const keywords = extractKeywords(concept);
  const similar = [];
  
  // Search through all HTML files
  const files = fs.readdirSync(ARTWORKS_DIR).filter(f => f.endsWith('.html'));
  
  for (const file of files) {
    const filepath = path.join(ARTWORKS_DIR, file);
    const content = fs.readFileSync(filepath, 'utf8');
    
    // Count keyword matches
    let matches = 0;
    for (const keyword of keywords) {
      // Case-insensitive search
      if (new RegExp(keyword, 'i').test(content)) {
        matches++;
      }
    }
    
    // If more than 40% of keywords match, it's similar
    const matchRatio = matches / keywords.length;
    if (matchRatio >= 0.4) {
      similar.push({
        file,
        matchRatio: (matchRatio * 100).toFixed(0),
        keywords: keywords.filter(k => new RegExp(k, 'i').test(content))
      });
    }
  }
  
  return {
    hasDuplicate: similar.length > 0,
    similar,
    keywords
  };
}

/**
 * Get unique concept suggestion
 */
function getSuggestion(concept, existingConcepts) {
  const duplicateCheck = checkForDuplicates(concept);
  
  if (duplicateCheck.hasDuplicate) {
    console.log('⚠️  Similar concepts detected:');
    duplicateCheck.similar.forEach(s => {
      console.log(`   - ${s.file} (${s.matchRatio}% match)`);
    });
    console.log('\n💡 Suggestion: Try a different technique or perspective');
  }
  
  return duplicateCheck;
}

// Export for use in other scripts
module.exports = { checkForDuplicates, extractKeywords, getSuggestion };

// CLI usage
if (require.main === module) {
  const concept = process.argv[2] || 'fractal spirals';
  const result = checkForDuplicates(concept);
  
  console.log(`Checking concept: "${concept}"`);
  console.log(`Keywords: ${result.keywords.join(', ')}`);
  console.log(`\nResult: ${result.hasDuplicate ? '⚠️  SIMILAR FOUND' : '✅ UNIQUE'}`);
  
  if (result.similar.length > 0) {
    console.log('\nSimilar artworks:');
    result.similar.forEach(s => {
      console.log(`  ${s.file} (${s.matchRatio}% match, keywords: ${s.keywords.join(', ')})`);
    });
  }
}
