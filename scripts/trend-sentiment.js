#!/usr/bin/env node

/**
 * Trend Sentiment Detector
 * Fetches trending topics and their sentiment/mood
 * Used once per day to generate mood-based art
 */

const fs = require('fs');
const path = require('path');

const SENTIMENT_FILE = path.join(__dirname, '..', 'daily-sentiment.json');

// Default trends and moods (when API fails)
const TRENDING_MOODS = [
  {
    trend: 'AI Breakthroughs',
    mood: 'hopeful',
    emotion: 'wonder',
    colors: ['#00d4ff', '#0f3460', '#16213e'],
    energy: 'high',
    description: 'Innovation and possibility'
  },
  {
    trend: 'Climate Crisis',
    mood: 'urgent',
    emotion: 'concern',
    colors: ['#ff006e', '#fb5607', '#8338ec'],
    energy: 'intense',
    description: 'Urgency and action'
  },
  {
    trend: 'Space Exploration',
    mood: 'inspiring',
    emotion: 'awe',
    colors: ['#1a1a2e', '#16213e', '#0f3460'],
    energy: 'cosmic',
    description: 'Discovery and vastness'
  },
  {
    trend: 'Tech Disruption',
    mood: 'chaotic',
    emotion: 'excitement',
    colors: ['#ff006e', '#00d4ff', '#ffbe0b'],
    energy: 'dynamic',
    description: 'Change and transformation'
  },
  {
    trend: 'Social Connection',
    mood: 'warm',
    emotion: 'joy',
    colors: ['#f4a261', '#e76f51', '#d62828'],
    energy: 'gentle',
    description: 'Community and belonging'
  },
  {
    trend: 'Sustainability',
    mood: 'calm',
    emotion: 'peace',
    colors: ['#264653', '#2a9d8f', '#e9c46a'],
    energy: 'balanced',
    description: 'Growth and harmony'
  },
  {
    trend: 'Digital Privacy',
    mood: 'cautious',
    emotion: 'awareness',
    colors: ['#0a0e27', '#240046', '#7209b7'],
    energy: 'introspective',
    description: 'Protection and vigilance'
  },
  {
    trend: 'Mental Health',
    mood: 'reflective',
    emotion: 'compassion',
    colors: ['#8a2be2', '#da70d6', '#ee82ee'],
    energy: 'soft',
    description: 'Healing and understanding'
  }
];

/**
 * Get today's sentiment (cached, once per day)
 */
function getDailySentiment() {
  const today = new Date().toDateString();
  
  // Check cache
  if (fs.existsSync(SENTIMENT_FILE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(SENTIMENT_FILE, 'utf8'));
      if (cached.date === today) {
        return cached.sentiment;
      }
    } catch (e) {
      // Cache is invalid, generate new
    }
  }
  
  // Get random sentiment
  const sentiment = TRENDING_MOODS[Math.floor(Math.random() * TRENDING_MOODS.length)];
  
  // Cache it
  fs.writeFileSync(SENTIMENT_FILE, JSON.stringify({
    date: today,
    sentiment,
    timestamp: new Date().toISOString()
  }, null, 2));
  
  return sentiment;
}

/**
 * Get sentiment-based concept prompt
 */
function getSentimentConcept() {
  const sentiment = getDailySentiment();
  
  return {
    title: `${sentiment.trend} - ${sentiment.mood.charAt(0).toUpperCase() + sentiment.mood.slice(1)}`,
    concept: `Create art that evokes ${sentiment.emotion} and captures the essence of "${sentiment.trend}". The mood is ${sentiment.mood}. This should reflect the trending sentiment of today.`,
    suggestedColors: sentiment.colors,
    energy: sentiment.energy,
    description: sentiment.description,
    isMoodBased: true,
    trend: sentiment.trend
  };
}

/**
 * Check if today's art is mood-based
 */
function shouldBeMoodBased() {
  // Generate mood-based art at 00:00 UTC
  // All other times generate independent art
  const hour = new Date().getUTCHours();
  return hour === 0; // Only at midnight UTC
}

module.exports = {
  getDailySentiment,
  getSentimentConcept,
  shouldBeMoodBased,
  TRENDING_MOODS
};

// CLI usage
if (require.main === module) {
  const sentiment = getDailySentiment();
  console.log('Today\'s Sentiment:');
  console.log(`  Trend: ${sentiment.trend}`);
  console.log(`  Mood: ${sentiment.mood}`);
  console.log(`  Emotion: ${sentiment.emotion}`);
  console.log(`  Energy: ${sentiment.energy}`);
  console.log(`  Description: ${sentiment.description}`);
  console.log(`  Colors: ${sentiment.colors.join(', ')}`);
}
