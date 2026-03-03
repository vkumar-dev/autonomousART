#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LIBRARY_FILE = path.join(__dirname, '..', 'prompts', 'library.json');

class PromptManager {
  constructor() {
    this.library = this.loadLibrary();
  }

  loadLibrary() {
    if (!fs.existsSync(LIBRARY_FILE)) {
      throw new Error(`Prompt library not found at ${LIBRARY_FILE}`);
    }
    return JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf8'));
  }

  /**
   * Get prompt by ID
   */
  getPromptById(id) {
    const prompt = this.library.prompts.find(p => p.id === id);
    if (!prompt) {
      throw new Error(`Prompt with ID ${id} not found`);
    }
    return prompt;
  }

  /**
   * Get prompt by name
   */
  getPromptByName(name) {
    const prompt = this.library.prompts.find(p => p.name === name);
    if (!prompt) {
      throw new Error(`Prompt named "${name}" not found`);
    }
    return prompt;
  }

  /**
   * Get all prompts for a task
   */
  getPromptsByTask(taskId) {
    const task = this.library.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task "${taskId}" not found`);
    }
    return task.prompts.map(id => this.getPromptById(id));
  }

  /**
   * Get task by ID
   */
  getTaskById(taskId) {
    const task = this.library.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task "${taskId}" not found`);
    }
    return task;
  }

  /**
   * Render prompt template with variables
   */
  renderTemplate(promptId, variables = {}) {
    const prompt = this.getPromptById(promptId);
    let template = prompt.template;

    // Replace all variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, value);
    }

    // Warn about unreplaced variables
    const unreplaced = template.match(/{{(\w+)}}/g);
    if (unreplaced) {
      console.warn(`⚠️  Unreplaced variables: ${unreplaced.join(', ')}`);
    }

    return template;
  }

  /**
   * Get inference parameters for a prompt
   */
  getParameters(promptId) {
    const prompt = this.getPromptById(promptId);
    return prompt.parameters;
  }

  /**
   * List all prompts with metadata
   */
  listPrompts() {
    return this.library.prompts.map(p => ({
      id: p.id,
      name: p.name,
      task: p.task,
      description: p.description,
      modelType: p.modelType,
      variables: p.variables
    }));
  }

  /**
   * List all tasks
   */
  listTasks() {
    return this.library.tasks.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      prompts: t.prompts
    }));
  }

  /**
   * Get prompt by index (for workflow execution)
   */
  getPromptByIndex(index) {
    if (index < 0 || index >= this.library.prompts.length) {
      throw new Error(`Prompt index ${index} out of range (0-${this.library.prompts.length - 1})`);
    }
    return this.library.prompts[index];
  }

  /**
   * Search prompts by criteria
   */
  searchPrompts(criteria = {}) {
    let results = this.library.prompts;

    if (criteria.task) {
      results = results.filter(p => p.task === criteria.task);
    }

    if (criteria.modelType) {
      results = results.filter(p => p.modelType === criteria.modelType);
    }

    if (criteria.name) {
      results = results.filter(p => p.name.includes(criteria.name));
    }

    return results;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  try {
    const manager = new PromptManager();

    if (args.includes('--list')) {
      console.log('\n📚 All Prompts:\n');
      manager.listPrompts().forEach(p => {
        console.log(`[${p.id}] ${p.name} - ${p.description}`);
        console.log(`    Task: ${p.task}, Model: ${p.modelType}`);
        if (p.variables.length > 0) {
          console.log(`    Variables: ${p.variables.join(', ')}`);
        }
        console.log('');
      });
    }

    if (args.includes('--tasks')) {
      console.log('\n📋 All Tasks:\n');
      manager.listTasks().forEach(t => {
        console.log(`${t.id}: ${t.name}`);
        console.log(`   ${t.description}`);
        console.log(`   Prompts: ${t.prompts.join(', ')}`);
        console.log('');
      });
    }

    if (args.includes('--show')) {
      const id = parseInt(args[args.indexOf('--show') + 1]);
      if (isNaN(id)) {
        console.log('Usage: --show <prompt-id>');
        process.exit(1);
      }
      const prompt = manager.getPromptById(id);
      console.log(`\n📝 Prompt #${id}: ${prompt.name}\n`);
      console.log(`Description: ${prompt.description}`);
      console.log(`Task: ${prompt.task}`);
      console.log(`Model: ${prompt.modelType}`);
      console.log(`Variables: ${prompt.variables.join(', ') || 'none'}`);
      console.log(`\nTemplate:\n${prompt.template}`);
      console.log(`\nParameters: ${JSON.stringify(prompt.parameters, null, 2)}`);
    }

    if (args.includes('--render')) {
      const id = parseInt(args[args.indexOf('--render') + 1]);
      if (isNaN(id)) {
        console.log('Usage: --render <prompt-id>');
        process.exit(1);
      }
      const prompt = manager.getPromptById(id);
      
      // Build variables from remaining args
      const variables = {};
      for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) continue;
        if (args[i - 1] === '--render') continue;
        
        // Try to parse as key=value
        if (args[i].includes('=')) {
          const [key, value] = args[i].split('=');
          variables[key] = value;
        }
      }

      const rendered = manager.renderTemplate(id, variables);
      console.log(`\n📄 Rendered Prompt #${id}:\n${rendered}`);
    }

    if (args.includes('--search')) {
      const criteria = {};
      const idx = args.indexOf('--search');
      if (args[idx + 1] && !args[idx + 1].startsWith('--')) {
        const search = args[idx + 1];
        if (search.includes(':')) {
          const [key, value] = search.split(':');
          criteria[key] = value;
        } else {
          criteria.name = search;
        }
      }

      const results = manager.searchPrompts(criteria);
      console.log(`\n🔍 Search Results (${results.length} found):\n`);
      results.forEach(p => {
        console.log(`[${p.id}] ${p.name} - ${p.description}`);
      });
    }

    if (args.length === 0 || args.includes('--help')) {
      console.log(`
📚 Prompt Manager

Usage:
  node prompt-manager.js --list              # List all prompts
  node prompt-manager.js --tasks             # List all tasks
  node prompt-manager.js --show <id>         # Show prompt template
  node prompt-manager.js --render <id>       # Render with variables
  node prompt-manager.js --search [criteria] # Search prompts

Examples:
  node prompt-manager.js --show 0
  node prompt-manager.js --render 0 TECHNIQUE="Fractal" TONE="Cosmic"
  node prompt-manager.js --search task:art-concept
  node prompt-manager.js --search name:generator
      `);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { PromptManager };
