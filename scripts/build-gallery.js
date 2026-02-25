#!/usr/bin/env node

/**
 * Build Gallery Index
 * Creates list of all artworks for the gallery
 */

const fs = require('fs');
const path = require('path');

const ARTWORKS_DIR = path.join(__dirname, '..', 'artworks');
const LIST_FILE = path.join(__dirname, '..', 'artworks-list.json');

function buildGallery() {
  const files = [];
  
  if (!fs.existsSync(ARTWORKS_DIR)) {
    fs.mkdirSync(ARTWORKS_DIR, { recursive: true });
  }

  const dirEntries = fs.readdirSync(ARTWORKS_DIR);
  
  for (const entry of dirEntries) {
    const fullPath = path.join(ARTWORKS_DIR, entry);
    const stat = fs.statSync(fullPath);
    
    if (stat.isFile() && entry.endsWith('.html')) {
      files.push(entry);
    }
  }
  
  // Sort by filename descending (latest first)
  files.sort((a, b) => b.localeCompare(a));
  
  // Write list
  fs.writeFileSync(LIST_FILE, JSON.stringify(files, null, 2));
  
  console.log(`Gallery built: ${files.length} artworks`);
  files.forEach((file, i) => {
    console.log(`  ${i + 1}. ${file}`);
  });
}

if (require.main === module) {
  buildGallery();
}

module.exports = { buildGallery };
