#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ARTWORKS_DIR = path.join(__dirname, '..', 'artworks');
const LIST_FILE = path.join(__dirname, '..', 'artworks-list.json');

function findAllArtworks(dir, baseDir = ARTWORKS_DIR) {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...findAllArtworks(fullPath, baseDir));
      } else if (stat.isFile() && entry.endsWith('.html')) {
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        files.push(relativePath);
      }
    }
  } catch (error) {
    console.warn(`⚠️  Could not read directory: ${error.message}`);
  }
  
  return files;
}

function buildGallery() {
  if (!fs.existsSync(ARTWORKS_DIR)) {
    fs.mkdirSync(ARTWORKS_DIR, { recursive: true });
  }

  const files = findAllArtworks(ARTWORKS_DIR);
  
  files.sort((a, b) => b.localeCompare(a));
  
  fs.writeFileSync(LIST_FILE, JSON.stringify(files, null, 2));
  
  console.log(`✅ Gallery built: ${files.length} artworks`);
  files.forEach((file, i) => {
    console.log(`  ${i + 1}. ${file}`);
  });
}

if (require.main === module) {
  buildGallery();
}

module.exports = { buildGallery };
