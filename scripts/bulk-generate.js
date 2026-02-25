#!/usr/bin/env node

/**
 * Bulk Art Generator for autonomousART
 * Generates N artworks automatically, falling back to offline generation to avoid rate limits
 */

const fs = require('fs');
const path = require('path');
const { generateArt } = require('./art-generator');
const { selectConcept, getConceptHistory } = require('./concept-selector');
const { buildGallery } = require('./build-gallery');

const CONCEPT_FILE = path.join(__dirname, '..', 'selected-concept.json');

// Delay between generations to ensure unique timestamps and reduce API load
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateBulk(count = 100) {
    console.log(`\n🚀 Starting bulk generation of ${count} artworks...`);

    // Track successes and failures
    let successes = 0;
    let failures = 0;

    for (let i = 1; i <= count; i++) {
        console.log(`\n-----------------------------------`);
        console.log(`🎨 Generating artwork ${i} of ${count}`);
        console.log(`-----------------------------------`);

        try {
            // 1. Select a concept
            // In this bulk mode, we want to try AI for the first few maybe, 
            // but to ensure we get 100, we might need to rely heavily on fallback
            // since the fallback logic already produces unique variations if we disable strict dup checks

            // Select concept (will use AI if configured, otherwise fallback)
            await selectConcept();

            // 2. Generate the art
            await generateArt();

            successes++;
            console.log(`✅ Successfully generated artwork ${i}`);

            // 3. Wait a moment to ensure timestamp uniqueness and avoid rate limits
            // Using 500ms delay locally
            await delay(500);

        } catch (error) {
            failures++;
            console.error(`❌ Failed to generate artwork ${i}:`, error.message);

            // Clean up concept file if it failed midway
            if (fs.existsSync(CONCEPT_FILE)) {
                fs.unlinkSync(CONCEPT_FILE);
            }

            // Continue to next even if one fails
            await delay(1000);
        }
    }

    console.log(`\n===================================`);
    console.log(`🎉 Bulk generation complete!`);
    console.log(`   Successes: ${successes}`);
    console.log(`   Failures: ${failures}`);
    console.log(`===================================`);

    // Update the gallery list
    console.log(`\n📸 Rebuilding gallery index...`);
    buildGallery();
}

// Check arguments
const args = process.argv.slice(2);
const count = args.length > 0 ? parseInt(args[0], 10) : 100;

if (isNaN(count) || count <= 0) {
    console.error("Please provide a valid number of artworks to generate.");
    process.exit(1);
}

// Run the bulk generator if called directly
if (require.main === module) {
    generateBulk(count).catch(err => {
        console.error("Fatal error during bulk generation:", err);
        process.exit(1);
    });
}

module.exports = { generateBulk };
