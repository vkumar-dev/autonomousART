# autonomousART Advanced Features

Comprehensive guide to autonomousART's intelligent art generation system.

## 🎨 Uniqueness & Duplicate Prevention

### Duplicate Detection System

**File:** `scripts/check-duplicates.js`

Prevents generating similar artworks using keyword-based similarity detection.

**How it works:**
1. Extracts keywords from concept titles
2. Searches existing artwork HTML for matching keywords
3. Calculates similarity ratio based on keyword matches
4. Flags similar artworks (>40% match) as duplicates

**Keywords Used:**
- Filtered for meaningful terms (>3 characters)
- Removes common stop words
- Returns top 5 unique keywords

**Example:**
```bash
node scripts/check-duplicates.js "cellular automata with life"
# Output:
# Keywords: cellular, automata, life
# Similar to: 20260225-115942-cellular-awakening.html (100% match)
```

### Automatic Duplicate Avoidance

The concept selector automatically:
1. Generates AI concept
2. Checks for duplicates
3. Retries if similar found (up to 3 attempts)
4. Falls back to unique fallback concepts

This ensures NO duplicate or similar artworks are generated.

---

## 🌍 Mood & Sentiment-Based Generation

### Daily Sentiment Tracking

**File:** `scripts/trend-sentiment.js`

Generates one art piece per day based on trending sentiment/mood (at 00:00 UTC).

**Pre-defined Moods:**
- AI Breakthroughs → hopeful, wonder, high energy
- Climate Crisis → urgent, concern, intense
- Space Exploration → inspiring, awe, cosmic
- Tech Disruption → chaotic, excitement, dynamic
- Social Connection → warm, joy, gentle
- Sustainability → calm, peace, balanced
- Digital Privacy → cautious, awareness, introspective
- Mental Health → reflective, compassion, soft

**Implementation:**
- Caches daily sentiment (one per day)
- Generates sentiment-based concepts
- Includes suggested colors matching mood
- Non-mood artworks generated other hours

**Example:**
```bash
node scripts/trend-sentiment.js
# Output:
# Trend: Digital Privacy
# Mood: cautious
# Emotion: awareness
# Colors: #0a0e27, #240046, #7209b7
```

---

## 🔄 Generation Pipeline

### Concept Selection Flow

```
START
  ↓
Check if hour = 00:00 UTC?
  ├─ YES → Use sentiment-based concept
  └─ NO → Use random/AI-generated concept
  ↓
Load AI prompt (if API available)
  ↓
Try AI generation (max 3 attempts)
  ├─ Each attempt checks for duplicates
  └─ Retries if similar found
  ↓
Check for duplicates
  ├─ Similar found? → Retry AI
  └─ Unique? → Continue
  ↓
Fallback to unique fallback concept
  ↓
Save to selected-concept.json
  ↓
Add to concept history
  ↓
DONE
```

---

## 🎭 Interaction Types

### Three Modes of Interaction

**STATIC**
- No motion or animation
- Mathematical visualization (frozen moment)
- Perfect for: Fractals, geometric patterns, static visualizations
- Example: Julia set zoom visualization

**DYNAMIC**
- Animated, continuous motion
- Changes over time (no user input)
- Includes animation speed specification
- Performance-optimized
- Perfect for: Particles, cellular automata, flowing landscapes
- Example: Particle swarm with gravity forces

**INTERACTIVE**
- Responds to user input
- Mouse movement, clicks, keyboard
- Responsiveness parameters specified
- Real-time feedback
- Perfect for: Force fields, physics systems, responsive art
- Example: Interactive gravity wells following mouse

---

## 📊 Enhanced Prompts

### Uniqueness Emphasis

The art generation prompt now includes:

**CRITICAL UNIQUENESS REQUIREMENT**
- Emphasizes MILLIONS of possible variations
- Stresses INFINITE possible artworks
- Warns against boilerplate code
- Requires novel combinations
- Demands unexpected elements
- References specific mathematical properties

**Key Sections:**
```
✓ Explore a unique combination of techniques
✓ Use novel parameters and algorithmic approaches
✓ Push boundaries and experiment
✓ AVOID boilerplate or generic implementations
✓ Include unexpected elements or twists
✓ Reference specific mathematical properties or behaviors
✓ Be technically interesting and innovative
```

**Technique Descriptions Expanded:**
Instead of generic descriptions, each technique now includes:
- Fractal: "recursive beauty, zoom dynamics, dimension variations, chaos theory"
- Particles: "attraction/repulsion, life cycles, swarm intelligence"
- Geometry: "tiling systems, symmetry breaking, recursive shapes"
- Etc.

---

## 📈 Art Tracking

### Concept History

**File:** `concept-history.json`

Tracks all generated concepts:
```json
{
  "concepts": [
    {
      "title": "Chaos Fractals",
      "date": "2026-02-25T12:11:56.000Z",
      "technique": "Fractal Mathematics",
      "isMoodBased": false
    },
    {
      "title": "Cellular Awakening",
      "date": "2026-02-25T11:59:42.000Z",
      "technique": "Cellular Automata",
      "isMoodBased": true
    }
  ],
  "lastUpdated": "2026-02-25T12:11:56.000Z"
}
```

### Daily Sentiment Cache

**File:** `daily-sentiment.json`

Caches one sentiment per day:
```json
{
  "date": "Wed Feb 25 2026",
  "sentiment": {
    "trend": "Digital Privacy",
    "mood": "cautious",
    "emotion": "awareness",
    "energy": "introspective",
    "colors": ["#0a0e27", "#240046", "#7209b7"],
    "description": "Protection and vigilance"
  },
  "timestamp": "2026-02-25T12:00:00.000Z"
}
```

---

## 🔧 Technical Details

### Keyword Extraction

```javascript
// From concept "Recursive spirals with golden ratio"
// Extracted keywords: recursive, spirals, golden
// (Filtered: >3 chars, no stopwords)
```

### Similarity Calculation

```
Matches = count of keywords found in existing artwork
Ratio = Matches / Total Keywords
Threshold = 40% (if ratio >= 0.4, marked as similar)
```

### Duplicate Check Example

**Concept:** "cellular automation evolution"  
**Keywords:** cellular, automation, evolution  
**Similar Found:** cellular-awakening.html  
**Match Ratio:** 66% (2 out of 3 keywords match)  
**Result:** ⚠️ SIMILAR FOUND - Retry

---

## 🚀 Usage Examples

### Test Duplicate Detection

```bash
cd /home/eliza/qwen/autonomousART

# Check for duplicates
node scripts/check-duplicates.js "particle swarm intelligence"

# Output if duplicate found:
# ⚠️ SIMILAR FOUND
# 20260225-115942-particle-entropy.html (75% match)
```

### Test Sentiment Generation

```bash
# Get today's sentiment
node scripts/trend-sentiment.js

# Output:
# Trend: Climate Crisis
# Mood: urgent
# Emotion: concern
# Energy: intense
```

### Test Concept Selection

```bash
# Select a concept (checks duplicates automatically)
node scripts/concept-selector.js

# Shows:
# - Duplicate checking
# - Sentiment info if applicable
# - Selected concept details
```

### Manual Art Generation

```bash
# Full cycle
node scripts/concept-selector.js
node scripts/art-generator.js
node scripts/build-gallery.js
git add .
git commit -m "New artwork"
git push
```

---

## 🎯 Design Philosophy

### Infinite Possibilities

The system is designed with the understanding that:
- Millions of algorithmic variations exist
- Infinite unique artworks are theoretically possible
- No bottleneck should exist
- Boilerplate is explicitly discouraged
- Each generation should explore new territory

### No Repetition

- Keyword-based duplicate detection
- AI-guided retries for uniqueness
- Fallback concepts are carefully selected
- History tracking prevents recent repeats
- Sentiment adds variety dimension

### Creative Diversity

- 8 art techniques
- 3 interaction modes
- 8 sentiment moods
- Infinite parameter combinations
- Algorithmic variation encouraged

---

## 🔐 Files Modified

- `prompts/art-generation.txt` - Enhanced with uniqueness emphasis
- `scripts/concept-selector.js` - Duplicate checking and sentiment integration
- `scripts/check-duplicates.js` - NEW: Duplicate detection
- `scripts/trend-sentiment.js` - NEW: Sentiment tracking

---

## 📋 Feature Checklist

- ✅ Duplicate prevention via keyword matching
- ✅ Mood-based art generation (1x daily)
- ✅ Sentiment caching
- ✅ Uniqueness emphasis in prompts
- ✅ Interaction type specification
- ✅ AI retry logic
- ✅ Fallback uniqueness checking
- ✅ Concept history tracking
- ✅ Sentiment history tracking

---

## 🎨 Next Generation Ideas

Potential enhancements:
- Web search for real-time trending (currently fallback list)
- Multi-modal sentiment (combining multiple trends)
- User feedback on art for better selection
- Gallery statistics and metrics
- Art similarity visualization
- Community voting on best concepts
- Collaborative art generation

---

**autonomousART: Exploring infinite creative possibilities** 🎨
