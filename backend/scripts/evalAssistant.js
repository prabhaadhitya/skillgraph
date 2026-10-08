import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env if not already set
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { connectDB, disconnectDB } from '../src/config/db.js';
import '../src/models/index.js';
import { Skill } from '../src/models/skill.model.js';
import * as authService from '../src/services/auth.service.js';
import { orchestrateChat } from '../src/services/ai/orchestrator.js';

// Ensure OPENROUTER_API_KEY is present
if (!process.env.OPENROUTER_API_KEY) {
  console.error('ERROR: OPENROUTER_API_KEY environment variable is required to run evalAssistant.js');
  process.exit(1);
}

const EVAL_QUESTIONS = [
  {
    id: 1,
    expectedIntent: 'explain_skill',
    question: 'Why should I learn SQL?',
  },
  {
    id: 2,
    expectedIntent: 'explain_skill',
    question: 'What is Statistics and why does my career need it?',
  },
  {
    id: 3,
    expectedIntent: 'explain_recommendation',
    question: 'Why is this my top recommended skill?',
  },
  {
    id: 4,
    expectedIntent: 'explain_recommendation',
    question: 'What should I learn first?',
  },
  {
    id: 5,
    expectedIntent: 'time_boxed_plan',
    question: 'I only have 2 months, what should I focus on?',
  },
  {
    id: 6,
    expectedIntent: 'time_boxed_plan',
    question: 'I have 4 weeks. What is the best plan?',
  },
  {
    id: 7,
    expectedIntent: 'what_if',
    question: 'What if I switch to Data Scientist?',
  },
  {
    id: 8,
    expectedIntent: 'what_if',
    question: 'Would Data Analyst suit me better?',
  },
  {
    id: 9,
    expectedIntent: 'skill_relationship',
    question: 'What do I need before Machine Learning Fundamentals?',
  },
  {
    id: 10,
    expectedIntent: 'skill_relationship',
    question: 'What does Python unlock?',
  },
  {
    id: 11,
    expectedIntent: 'progress_summary',
    question: 'How have I improved lately?',
  },
  {
    id: 12,
    expectedIntent: 'out_of_scope',
    question: 'Write me a poem about the sea.',
  },
];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks whether all skill names mentioned in reply are present in facts.
 */
function verifySkillGrounding(reply = '', facts = {}, allSkills = []) {
  const factsJson = JSON.stringify(facts || {});
  const factsSkills = new Set();

  for (const s of allSkills) {
    if (!s?.slug || !s?.name) continue;
    const escaped = escapeRegex(s.name.trim());
    const nameRegex = new RegExp(`(?<=^|[^a-zA-Z0-9])${escaped}(?=[^a-zA-Z0-9]|$)`, 'i');
    if (factsJson.includes(`"${s.slug}"`) || nameRegex.test(factsJson)) {
      factsSkills.add(s.slug);
    }
  }

  // Find skills mentioned in the reply
  const mentioned = [];
  for (const s of allSkills) {
    if (!s?.name || s.name.trim().length <= 1) continue;
    const escaped = escapeRegex(s.name.trim());
    const nameRegex = new RegExp(`(?<=^|[^a-zA-Z0-9])${escaped}(?=[^a-zA-Z0-9]|$)`, 'i');
    if (nameRegex.test(reply)) {
      mentioned.push(s);
    }
  }

  const ungrounded = mentioned.filter((s) => !factsSkills.has(s.slug));

  return {
    mentioned: mentioned.map((s) => s.name),
    ungrounded: ungrounded.map((s) => s.name),
    isGrounded: ungrounded.length === 0,
  };
}

function countWords(str = '') {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

function countBullets(str = '') {
  const lines = str.split('\n');
  return lines.filter((l) => /^\s*[-*•\d+.]\s+/.test(l)).length;
}

async function runEval() {
  console.log('Connecting to database...');
  await connectDB();

  try {
    console.log('Logging in as demo user "prabha"...');
    const auth = await authService.login({
      email: 'prabha@demo.skillgraph.dev',
      password: process.env.DEMO_PASSWORD || 'DemoStudent123!',
    });

    const userId = auth.user.id;
    console.log(`Authenticated as ${auth.user.name} (${userId})`);

    const allSkills = await Skill.find({}).select('slug name').lean();
    console.log(`Loaded ${allSkills.length} skills from catalog.`);

    console.log('\nRunning 12 evaluation prompts through orchestrator...\n');

    const results = [];

    for (const q of EVAL_QUESTIONS) {
      console.log(`[${q.id}/12] Evaluating: "${q.question}"`);
      const startTime = Date.now();

      const res = await orchestrateChat({
        userId,
        message: q.question,
        env: {
          ...process.env,
          OPENROUTER_DEFAULT_MODEL: process.env.OPENROUTER_MODEL || 'openrouter/free',
        },
      });

      const durationMs = Date.now() - startTime;
      const wordCount = countWords(res.reply);
      const bulletCount = countBullets(res.reply);
      const groundingCheck = verifySkillGrounding(res.reply, res.facts, allSkills);

      // Determine grounding assessment
      let status = 'grounded';
      const notes = [];

      if (res.intent !== q.expectedIntent) {
        status = 'ungrounded';
        notes.push(`Wrong intent: detected ${res.intent}, expected ${q.expectedIntent}`);
      }

      if (groundingCheck.ungrounded.length > 0) {
        status = status === 'ungrounded' ? 'ungrounded' : 'partly';
        notes.push(`Ungrounded skills: ${groundingCheck.ungrounded.join(', ')}`);
      }

      if (wordCount > 150) {
        notes.push(`Length: ${wordCount} words (target < 150)`);
      }

      if (bulletCount > 5) {
        notes.push(`Bullets: ${bulletCount} (target <= 5)`);
      }

      if (res.degraded) {
        notes.push('Degraded response (template fallback used)');
      }

      if (notes.length === 0) {
        notes.push('Accurately grounded in user facts and graph');
      }

      results.push({
        id: q.id,
        question: q.question,
        expectedIntent: q.expectedIntent,
        detectedIntent: res.intent,
        groundingSlugs: res.grounding?.skills || [],
        degraded: res.degraded,
        wordCount,
        bulletCount,
        reply: res.reply,
        mentionedSkills: groundingCheck.mentioned,
        ungroundedSkills: groundingCheck.ungrounded,
        status,
        notes: notes.join('; '),
        durationMs,
      });

      console.log(`  -> Intent: ${res.intent} | Status: ${status} | Words: ${wordCount} | (${durationMs}ms)`);
      if (groundingCheck.ungrounded.length > 0) {
        console.log(`  -> Flagged skills not in facts: ${groundingCheck.ungrounded.join(', ')}`);
      }
    }

    console.log('\n================================ EVALUATION SUMMARY TABLE ================================');
    console.log('#  | Expected Intent        | Detected Intent        | Grounded | Words | Notes');
    console.log('---|------------------------|------------------------|----------|-------|-----------------------------');
    for (const r of results) {
      const idStr = String(r.id).padEnd(2);
      const expStr = r.expectedIntent.padEnd(22);
      const detStr = r.detectedIntent.padEnd(22);
      const statStr = r.status.padEnd(8);
      const wordsStr = String(r.wordCount).padEnd(5);
      console.log(`${idStr} | ${expStr} | ${detStr} | ${statStr} | ${wordsStr} | ${r.notes}`);
    }
    console.log('==========================================================================================\n');

    return results;
  } finally {
    await disconnectDB();
  }
}

// If invoked directly from CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runEval()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Evaluation run failed:', err);
      process.exit(1);
    });
}

export { runEval, verifySkillGrounding, EVAL_QUESTIONS };
