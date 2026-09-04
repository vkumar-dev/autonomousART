#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const HfInference = require('./hf-inference');
const { PromptManager } = require('./prompt-manager');
const { generateCanvasArt, generateHTML } = require('./art-generator');

const CONCEPT_FILE = path.join(__dirname, '..', 'selected-concept.json');
const EXECUTION_LOG = path.join(__dirname, '..', 'workflow-execution.json');

class WorkflowExecutor {
  constructor() {
    this.promptManager = new PromptManager();
    this.executions = this.loadExecutionLog();
  }

  loadExecutionLog() {
    if (fs.existsSync(EXECUTION_LOG)) {
      return JSON.parse(fs.readFileSync(EXECUTION_LOG, 'utf8'));
    }
    return {
      executions: [],
      lastUpdated: null
    };
  }

  saveExecutionLog() {
    this.executions.lastUpdated = new Date().toISOString();
    fs.writeFileSync(EXECUTION_LOG, JSON.stringify(this.executions, null, 2));
  }

  /**
   * Execute a prompt by ID with inference
   */
  async executePrompt(promptId, variables = {}, options = {}) {
    const {
      verbose = true,
      dryRun = false,
      useConfigModel = true
    } = options;

    try {
      if (verbose) console.log(`\n🔄 Executing Prompt #${promptId}...\n`);

      // Get prompt from library
      const prompt = this.promptManager.getPromptById(promptId);
      const params = this.promptManager.getParameters(promptId);

      if (verbose) {
        console.log(`📝 Prompt: ${prompt.name}`);
        console.log(`📋 Task: ${prompt.task}`);
        console.log(`🤖 Model Type: ${prompt.modelType}\n`);
      }

      // Render template with variables
      const rendered = this.promptManager.renderTemplate(promptId, variables);

      if (verbose) {
        console.log(`📄 Rendered Template:\n${rendered}\n`);
      }

      if (dryRun) {
        console.log('✓ Dry run - no inference executed');
        return {
          promptId,
          success: true,
          dryRun: true,
          content: '[DRY RUN - NO OUTPUT]',
          rendered
        };
      }

      // Execute inference
      if (verbose) console.log('🧠 Running inference...\n');

      const inference = new HfInference();
      const result = inference.generate(rendered, {
        ...params
      });

      if (!result.success) {
        throw new Error(result.error || 'Inference failed');
      }

      if (verbose) {
        console.log(`✅ Inference completed`);
        console.log(`📊 Tokens: ${result.tokens}`);
        console.log(`🔄 Fallback used: ${result.usedFallback ? 'Yes' : 'No'}\n`);
      }

      return {
        promptId,
        promptName: prompt.name,
        task: prompt.task,
        success: true,
        content: result.content,
        model: result.model,
        tokens: result.tokens,
        usedFallback: result.usedFallback,
        timestamp: new Date().toISOString(),
        variables,
        rendered
      };

    } catch (error) {
      console.error(`❌ Execution failed: ${error.message}`);
      return {
        promptId,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute concept generation workflow (Prompt #0)
   */
  async generateConcept(variables = {}) {
    const result = await this.executePrompt(0, variables);

    if (!result.success) {
      return result;
    }

    // Parse the response into a concept object
    const concept = this.parseConceptResponse(result.content);

    // Save concept file
    fs.writeFileSync(CONCEPT_FILE, JSON.stringify(concept, null, 2));

    if (console) {
      console.log('✅ Concept saved!');
      console.log(`   Title: ${concept.title}`);
      console.log(`   Technique: ${concept.technique}\n`);
    }

    return {
      ...result,
      concept,
      conceptFile: CONCEPT_FILE
    };
  }

  /**
   * Execute full art generation workflow
   */
  async generateArt(variables = {}) {
    console.log('🎨 Starting full art generation workflow...\n');

    // Step 1: Generate concept
    const conceptResult = await this.generateConcept(variables);
    if (!conceptResult.success) {
      return conceptResult;
    }

    // Step 2: Generate canvas art
    console.log('🖼️  Generating canvas art...\n');
    const { generateArt } = require('./art-generator');
    
    try {
      const artResult = await generateArt();
      
      console.log('🎨 Art generation complete!');
      
      // Log execution
      this.logExecution({
        workflow: 'full-art-generation',
        steps: [
          {
            step: 'concept_generation',
            promptId: 0,
            success: conceptResult.success,
            concept: conceptResult.concept
          },
          {
            step: 'art_generation',
            success: true,
            output: artResult
          }
        ],
        timestamp: new Date().toISOString(),
        variables
      });

      return {
        success: true,
        concept: conceptResult.concept,
        art: artResult,
        conceptResult,
        artResult
      };
    } catch (error) {
      console.error(`❌ Art generation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        conceptResult
      };
    }
  }

  /**
   * Execute concept refinement workflow
   */
  async refineConcept(concept, variables = {}) {
    const defaultVars = {
      TITLE: concept.title,
      CONCEPT: concept.concept,
      TECHNIQUE: concept.technique,
      ...variables
    };

    const result = await this.executePrompt(1, defaultVars);

    if (!result.success) {
      return result;
    }

    const refined = this.parseConceptResponse(result.content);
    fs.writeFileSync(CONCEPT_FILE, JSON.stringify(refined, null, 2));

    return {
      ...result,
      originalConcept: concept,
      refinedConcept: refined
    };
  }

  /**
   * Parse concept generation response
   */
  parseConceptResponse(response) {
    const ART_TECHNIQUES = [
      'Fractal Mathematics', 'Particle Dynamics', 'Perlin Noise Landscapes',
      'Generative Geometry', 'Cellular Automata', 'Color Theory',
      'Interactive Physics', 'Abstract Expressionism'
    ];

    const EMOTIONAL_TONES = [
      'Hypnotic and meditative', 'Chaotic yet harmonious', 'Peaceful and dreamy',
      'Sacred and mathematical', 'Mysterious and alive', 'Energetic and vibrant',
      'Cosmic and transcendent', 'Mind-bending complexity', 'Beautiful and poetic',
      'Intricate and subtle', 'Thought-provoking', 'Surreal and dreamlike'
    ];

    const concept = {
      title: 'Untitled Concept',
      concept: 'A unique generative art piece',
      technique: ART_TECHNIQUES[Math.floor(Math.random() * ART_TECHNIQUES.length)],
      colors: ['#1a1a2e', '#16213e', '#0f3460', '#e94560'],
      tone: EMOTIONAL_TONES[Math.floor(Math.random() * EMOTIONAL_TONES.length)],
      generated: 'workflow-executor'
    };

    try {
      const lines = response.split('\n').map(l => l.trim()).filter(l => l);

      lines.forEach(line => {
        const titleMatch = line.match(/^Title:\s*(.+)$/i);
        if (titleMatch) {
          concept.title = titleMatch[1].trim().replace(/^["']|["']$/g, '').slice(0, 50);
        }

        const conceptMatch = line.match(/^Concept:\s*(.+)$/i);
        if (conceptMatch) {
          concept.concept = conceptMatch[1].trim().replace(/^["']|["']$/g, '').slice(0, 300);
        }

        const techniqueMatch = line.match(/^Technique:\s*(.+)$/i);
        if (techniqueMatch) {
          const mentioned = techniqueMatch[1].trim();
          const found = ART_TECHNIQUES.find(t => mentioned.toLowerCase().includes(t.toLowerCase()));
          if (found) concept.technique = found;
        }

        if (line.match(/^Colors:/i)) {
          const colorMatches = line.match(/#[0-9a-fA-F]{3,6}/g);
          if (colorMatches && colorMatches.length > 0) {
            concept.colors = [...new Set(colorMatches.slice(0, 5))];
          }
        }

        const toneMatch = line.match(/^Tone:\s*(.+)$/i);
        if (toneMatch) {
          const mentioned = toneMatch[1].trim();
          const found = EMOTIONAL_TONES.find(t => mentioned.toLowerCase().includes(t.toLowerCase()));
          if (found) concept.tone = found;
        }
      });
    } catch (error) {
      console.warn('⚠️  Parse error:', error.message);
    }

    return concept;
  }

  /**
   * Log execution for audit trail
   */
  logExecution(execution) {
    this.executions.executions.push(execution);
    this.saveExecutionLog();
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit = 10) {
    return this.executions.executions.slice(-limit).reverse();
  }
}

async function main() {
  const args = process.argv.slice(2);

  try {
    const executor = new WorkflowExecutor();

    if (args.includes('--concept')) {
      console.log('🎨 Generating art concept...\n');
      const result = await executor.generateConcept();
      console.log(JSON.stringify(result.concept, null, 2));
      process.exit(result.success ? 0 : 1);
    }

    if (args.includes('--full')) {
      const result = await executor.generateArt();
      process.exit(result.success ? 0 : 1);
    }

    if (args.includes('--execute')) {
      const promptId = parseInt(args[args.indexOf('--execute') + 1]);
      if (isNaN(promptId)) {
        console.log('Usage: --execute <prompt-id>');
        process.exit(1);
      }

      const variables = {};
      for (let i = 0; i < args.length; i++) {
        if (args[i].includes('=')) {
          const [key, value] = args[i].split('=');
          variables[key] = value;
        }
      }

      const result = await executor.executePrompt(promptId, variables);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    }

    if (args.includes('--history')) {
      const limit = parseInt(args[args.indexOf('--history') + 1]) || 10;
      const history = executor.getExecutionHistory(limit);
      console.log(`\n📋 Execution History (last ${limit}):\n`);
      history.forEach((exec, idx) => {
        console.log(`${idx + 1}. ${exec.workflow || exec.workflow} at ${exec.timestamp}`);
        if (exec.steps) {
          exec.steps.forEach(step => {
            console.log(`   - ${step.step}: ${step.success ? '✅' : '❌'}`);
          });
        }
      });
    }

    if (args.length === 0 || args.includes('--help')) {
      console.log(`
🎨 Workflow Executor

Usage:
  node workflow-executor.js --concept              # Generate concept only
  node workflow-executor.js --full                 # Full art generation workflow
  node workflow-executor.js --execute <id>         # Execute single prompt
  node workflow-executor.js --history [limit]      # Show execution history

Examples:
  node workflow-executor.js --concept
  node workflow-executor.js --execute 0 TECHNIQUE="Fractal" TONE="Cosmic"
  node workflow-executor.js --full
  node workflow-executor.js --history 5
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

module.exports = { WorkflowExecutor };
