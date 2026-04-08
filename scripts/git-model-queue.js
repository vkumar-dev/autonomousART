#!/usr/bin/env node

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'models.config.json');

class GitModelQueue {
  constructor(repoPath = path.join(__dirname, '..')) {
    this.repoPath = repoPath;
  }

  /**
   * Get all model config versions from git history
   * Returns array of {model, commit, timestamp, message}
   */
  getModelHistory(limit = 50) {
    try {
      // Get commits that modified models.config.json
      const output = execFileSync('git', ['-C', this.repoPath, 'log', '--oneline', '--follow', '-n', String(limit), '--', 'models.config.json'], { encoding: 'utf8' }).trim();

      if (!output) {
        console.log('⚠️  No git history found for models.config.json');
        return [];
      }

      const commits = output.split('\n');
      const history = [];

      for (const line of commits) {
        const [hash, ...messageParts] = line.split(' ');
        const message = messageParts.join(' ');

        try {
          // Get the config from this commit
          const configStr = execFileSync('git', ['-C', this.repoPath, 'show', `${hash}:models.config.json`], { encoding: 'utf8' });
          const config = JSON.parse(configStr);

          // Get commit timestamp
          const timestamp = execFileSync('git', ['-C', this.repoPath, 'log', '-1', '--format=%aI', hash], { encoding: 'utf8' }).trim();

          history.push({
            model: config.primaryModel,
            fallbackModel: config.fallbackModel,
            commit: hash,
            timestamp,
            message,
            config
          });
        } catch (error) {
          console.log(`  ⚠️  Could not parse config at ${hash}: ${error.message}`);
        }
      }

      return history;
    } catch (error) {
      console.log(`⚠️  Error getting git history: ${error.message}`);
      return [];
    }
  }

  /**
   * Get ordered fallback queue: current model, then previous versions from git
   */
  getFallbackQueue(limit = 20) {
    try {
      // Load current config
      let current = null;
      if (fs.existsSync(CONFIG_FILE)) {
        current = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      }

      // Get historical configs
      const history = this.getModelHistory(limit);

      // Build queue: current, then previous unique models
      const queue = [];
      const seenModels = new Set();

      // Add current
      if (current && current.primaryModel) {
        queue.push({
          model: current.primaryModel,
          source: 'current',
          timestamp: current.lastUpdated || new Date().toISOString()
        });
        seenModels.add(current.primaryModel);

        // Add fallback if different
        if (current.fallbackModel && !seenModels.has(current.fallbackModel)) {
          queue.push({
            model: current.fallbackModel,
            source: 'config_fallback',
            timestamp: current.lastUpdated || new Date().toISOString()
          });
          seenModels.add(current.fallbackModel);
        }
      }

      // Add historical models (skip duplicates)
      for (const entry of history) {
        if (!seenModels.has(entry.model)) {
          queue.push({
            model: entry.model,
            source: `git:${entry.commit.slice(0, 7)}`,
            timestamp: entry.timestamp,
            message: entry.message
          });
          seenModels.add(entry.model);
        }

        if (entry.fallbackModel && !seenModels.has(entry.fallbackModel)) {
          queue.push({
            model: entry.fallbackModel,
            source: `git_fallback:${entry.commit.slice(0, 7)}`,
            timestamp: entry.timestamp
          });
          seenModels.add(entry.fallbackModel);
        }
      }

      return queue;
    } catch (error) {
      console.error('❌ Error building fallback queue:', error.message);
      return [];
    }
  }

  /**
   * Print fallback queue in order
   */
  printQueue() {
    const queue = this.getFallbackQueue();
    console.log('\n📋 Model Fallback Queue:\n');
    queue.forEach((entry, idx) => {
      console.log(`  ${idx + 1}. ${entry.model}`);
      console.log(`     Source: ${entry.source}`);
      console.log(`     Time: ${entry.timestamp}`);
      if (entry.message) {
        console.log(`     Commit: ${entry.message}`);
      }
      console.log('');
    });
    console.log(`Total: ${queue.length} models available\n`);
  }

  /**
   * Get next fallback model after given model
   */
  getNextFallback(currentModel) {
    const queue = this.getFallbackQueue();
    const currentIndex = queue.findIndex(m => m.model === currentModel);

    if (currentIndex === -1) {
      console.log(`⚠️  Model "${currentModel}" not found in queue, returning first available`);
      return queue[0]?.model || null;
    }

    if (currentIndex + 1 >= queue.length) {
      console.log(`⚠️  No more fallbacks after "${currentModel}"`);
      return null;
    }

    return queue[currentIndex + 1];
  }

  /**
   * Get model at specific position in queue
   */
  getModelAtIndex(index) {
    const queue = this.getFallbackQueue();
    return queue[index] || null;
  }

  /**
   * Statistics on model changes
   */
  getStats() {
    const history = this.getModelHistory();
    const models = new Set();
    const transitions = [];

    let prevModel = null;
    for (const entry of history) {
      models.add(entry.model);
      if (prevModel && prevModel !== entry.model) {
        transitions.push({ from: prevModel, to: entry.model });
      }
      prevModel = entry.model;
    }

    return {
      uniqueModels: models.size,
      totalUpdates: history.length,
      transitions: transitions.length,
      currentModel: this.getFallbackQueue()[0]?.model,
      queueDepth: this.getFallbackQueue().length
    };
  }
}

async function main() {
  const queue = new GitModelQueue();
  const args = process.argv.slice(2);

  if (args.includes('--show')) {
    queue.printQueue();
  } else if (args.includes('--stats')) {
    const stats = queue.getStats();
    console.log('\n📊 Model Statistics:\n');
    console.log(`  Unique models: ${stats.uniqueModels}`);
    console.log(`  Total updates: ${stats.totalUpdates}`);
    console.log(`  Transitions: ${stats.transitions}`);
    console.log(`  Current model: ${stats.currentModel}`);
    console.log(`  Queue depth: ${stats.queueDepth}\n`);
  } else if (args.includes('--next')) {
    const current = args[args.indexOf('--next') + 1];
    if (!current) {
      console.log('Usage: --next <model-name>');
      process.exit(1);
    }
    const next = queue.getNextFallback(current);
    console.log(`\nNext fallback after "${current}": ${next || 'NONE'}\n`);
  } else {
    queue.printQueue();
  }
}

if (require.main === module) {
  main();
}

module.exports = { GitModelQueue };
