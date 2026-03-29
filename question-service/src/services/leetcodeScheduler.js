import axios from 'axios';
import cron from 'node-cron';
import pool from '../db/index.js';

// ── Config ────────────────────────────────────────────────────
const LEETCODE_API = process.env.LEETCODE_API_URL || 'https://alfa-leetcode-api.onrender.com';

const CONFIG = {
  cronSchedule:          process.env.LEETCODE_SYNC_CRON             || '0 * * * *',
  batchSize:             parseInt(process.env.LEETCODE_BATCH_SIZE)   || 5,
  fetchLimitPerRun:      parseInt(process.env.LEETCODE_FETCH_LIMIT)  || 10,
  delayBetweenQuestions: parseInt(process.env.LEETCODE_REQUEST_DELAY_MS)    || 5000,
  retryDelay:            parseInt(process.env.LEETCODE_RETRY_DELAY_MS)      || 10000,
  rateLimitDelay:        parseInt(process.env.LEETCODE_RATE_LIMIT_DELAY_MS) || 300000,
  maxRetries:            parseInt(process.env.LEETCODE_MAX_RETRIES)  || 3,
  runOnStart:            process.env.LEETCODE_RUN_ON_START === 'true',
};

// ── Topic mapping ─────────────────────────────────────────────
const TAG_MAP = {
  array:                  'Arrays',
  string:                 'Strings',
  'hash-table':           'Hash Table',
  'dynamic-programming':  'Dynamic Programming',
  math:                   'Mathematics',
  sorting:                'Algorithms',
  greedy:                 'Algorithms',
  'depth-first-search':   'Algorithms',
  'breadth-first-search': 'Algorithms',
  'binary-search':        'Algorithms',
  'two-pointers':         'Algorithms',
  'sliding-window':       'Algorithms',
  'linked-list':          'Data Structures',
  tree:                   'Data Structures',
  'binary-tree':          'Data Structures',
  'binary-search-tree':   'Data Structures',
  graph:                  'Graphs',
  'heap-priority-queue':  'Data Structures',
  stack:                  'Data Structures',
  queue:                  'Data Structures',
  recursion:              'Recursion',
  backtracking:           'Algorithms',
  'bit-manipulation':     'Bit Manipulation',
  database:               'Databases',
  'divide-and-conquer':   'Algorithms',
  'union-find':           'Data Structures',
  trie:                   'Data Structures',
  matrix:                 'Arrays',
};

// ── Progress tracker ──────────────────────────────────────────
class ProgressTracker {
  constructor() {
    this.inserted = 0;
    this.skipped = 0;
    this.failed = 0;
    this.retried = 0;
    this.startTime = Date.now();
  }

  log(status, title, extra = '') {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const icons = { inserted: '✅', skipped: '⏭ ', failed: '❌', retry: '🔄', warn: '⚠️ ' };
    console.log(`[${elapsed}s] ${icons[status] || '  '} ${title} ${extra}`);
  }

  summary(nextSkip) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log('\n────────────────────────────────────────');
    console.log(`📊 Sync complete in ${elapsed}s`);
    console.log(`   ✅ Inserted  : ${this.inserted}`);
    console.log(`   ⏭  Skipped   : ${this.skipped} (duplicates)`);
    console.log(`   🔄 Retried   : ${this.retried}`);
    console.log(`   ❌ Failed    : ${this.failed}`);
    console.log(`   📌 Next skip : ${nextSkip} (saved to DB)`);
    console.log('────────────────────────────────────────\n');
  }
}

// ── Helpers ───────────────────────────────────────────────────
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mapDifficulty = (d) => ({ Easy: 'Easy', Medium: 'Medium', Hard: 'Hard' }[d] || 'Medium');

const mapTopics = (tags = []) => {
  const mapped = tags.map((tag) => TAG_MAP[tag.slug] || null).filter(Boolean);
  return [...new Set(mapped)].length > 0 ? [...new Set(mapped)] : ['Algorithms'];
};

const stripHtml = (html = '') =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

// ── Persistent skip state ─────────────────────────────────────
// Stores the current LeetCode pagination offset in the DB
// so it survives service restarts and picks up where it left off.
const getSkip = async () => {
  try {
    const result = await pool.query(
      "SELECT value FROM scheduler_state WHERE key = 'leetcode_skip'"
    );
    return result.rows.length > 0 ? parseInt(result.rows[0].value) : 0;
  } catch {
    return 0;
  }
};

const saveSkip = async (skip) => {
  try {
    await pool.query(
      `INSERT INTO scheduler_state (key, value, updated_at)
       VALUES ('leetcode_skip', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [String(skip)]
    );
  } catch (err) {
    console.error('[scheduler] Failed to save skip state:', err.message);
  }
};

// ── Duplicate detection ───────────────────────────────────────
const questionExists = async (title) => {
  try {
    const result = await pool.query(
      'SELECT 1 FROM questions WHERE title = $1 LIMIT 1',
      [title]
    );
    return result.rows.length > 0;
  } catch (err) {
    console.error('[scheduler] Duplicate check failed:', err.message);
    return false;
  }
};

// ── Fetch a batch of question stubs ──────────────────────────
const fetchBatch = async (skip, limit, tracker) => {
  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const response = await axios.get(`${LEETCODE_API}/problems`, {
        params: { limit, skip },
        timeout: 30000,
      });
      return response.data?.problemsetQuestionList || [];
    } catch (err) {
      const is429 = err.response?.status === 429;

      if (is429) {
        tracker.retried++;
        tracker.log('warn', `Rate limited on batch (skip=${skip})`, `— waiting ${CONFIG.rateLimitDelay / 1000}s...`);
        await sleep(CONFIG.rateLimitDelay);
        attempt--; // don't count rate limit as an attempt
      } else if (attempt < CONFIG.maxRetries) {
        tracker.retried++;
        tracker.log('retry', `Batch fetch failed (skip=${skip})`, `(attempt ${attempt}/${CONFIG.maxRetries}, retrying in ${CONFIG.retryDelay / 1000}s)`);
        await sleep(CONFIG.retryDelay);
      } else {
        console.error(`[scheduler] Failed to fetch batch at skip=${skip}:`, err.message);
        return [];
      }
    }
  }
  return [];
};

// ── Fetch question detail by slug ─────────────────────────────
const fetchDetail = async (slug, tracker) => {
  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const response = await axios.get(`${LEETCODE_API}/select`, {
        params: { titleSlug: slug },
        timeout: 30000,
      });
      return response.data || null;
    } catch (err) {
      const is429 = err.response?.status === 429;

      if (is429) {
        tracker.retried++;
        tracker.log('warn', slug, `— rate limited, waiting ${CONFIG.rateLimitDelay / 1000}s...`);
        await sleep(CONFIG.rateLimitDelay);
        attempt--; // don't count rate limit as an attempt
      } else if (attempt < CONFIG.maxRetries) {
        tracker.retried++;
        tracker.log('retry', slug, `(attempt ${attempt}/${CONFIG.maxRetries}, retrying in ${CONFIG.retryDelay / 1000}s)`);
        await sleep(CONFIG.retryDelay);
      } else {
        console.error(`[scheduler] Failed to fetch detail for ${slug}:`, err.message);
        return null;
      }
    }
  }
  return null;
};

// ── Insert question into DB ───────────────────────────────────
const insertQuestion = async (payload) => {
  const result = await pool.query(
    `INSERT INTO questions
       (title, description, constraints, test_cases, leetcode_link, difficulty, topics, image_urls)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING question_id, title`,
    [
      payload.title,
      payload.description,
      payload.constraints || null,
      JSON.stringify(payload.testCases),
      payload.leetcodeLink,
      payload.difficulty,
      payload.topics,
      [],
    ]
  );
  return result.rows[0];
};

// ── Main sync job ─────────────────────────────────────────────
let isRunning = false;

const runSync = async () => {
  if (isRunning) {
    console.log('[scheduler] Sync already in progress, skipping this run.');
    return;
  }

  isRunning = true;

  // Load persistent skip from DB — picks up where the last run left off
  let skip = await getSkip();

  console.log(`\n[scheduler] Starting LeetCode sync at ${new Date().toISOString()}`);
  console.log(`[scheduler] Resuming from skip=${skip} | batch size ${CONFIG.batchSize} | ${CONFIG.delayBetweenQuestions / 1000}s delay`);

  const tracker = new ProgressTracker();
  let totalProcessed = 0;

  try {
    while (totalProcessed < CONFIG.fetchLimitPerRun) {
      if (isShuttingDown) {
        console.log('[scheduler] Shutdown requested — stopping sync gracefully.');
        break;
      }

      console.log(`\n[scheduler] Fetching batch (skip=${skip}, size=${CONFIG.batchSize})...`);
      const batch = await fetchBatch(skip, CONFIG.batchSize, tracker);

      if (batch.length === 0) {
        // Reached end of LeetCode question list — reset skip to start over
        console.log('[scheduler] Reached end of LeetCode question list — resetting skip to 0.');
        skip = 0;
        await saveSkip(skip);
        break;
      }

      for (const problem of batch) {
        if (isShuttingDown) break;
        if (totalProcessed >= CONFIG.fetchLimitPerRun) break;

        const slug = problem.titleSlug;
        const title = problem.title;

        // Duplicate check
        const exists = await questionExists(title);
        if (exists) {
          tracker.skipped++;
          tracker.log('skipped', title, '(already in DB)');
          totalProcessed++;
          continue;
        }

        // Fetch full detail
        const detail = await fetchDetail(slug, tracker);
        if (!detail) {
          tracker.failed++;
          tracker.log('failed', slug, '(no detail returned)');
          totalProcessed++;
          await sleep(CONFIG.delayBetweenQuestions);
          continue;
        }

        // Build and insert
        const q = detail.question || detail;
        const payload = {
          title: q.title || title,
          description: q.content ? stripHtml(q.content) : 'See LeetCode for full description.',
          constraints: null,
          testCases: [{ input: 'See LeetCode link for test cases', output: 'See LeetCode link for test cases' }],
          leetcodeLink: `https://leetcode.com/problems/${slug}/`,
          difficulty: mapDifficulty(q.difficulty || problem.difficulty),
          topics: mapTopics(q.topicTags || []),
        };

        try {
          const inserted = await insertQuestion(payload);
          tracker.inserted++;
          tracker.log('inserted', payload.title, `(ID: ${inserted.question_id})`);
        } catch (err) {
          tracker.failed++;
          tracker.log('failed', payload.title, `(DB error: ${err.message})`);
        }

        totalProcessed++;
        await sleep(CONFIG.delayBetweenQuestions);
      }

      // Advance skip by batch size and persist to DB
      skip += CONFIG.batchSize;
      await saveSkip(skip);
    }
  } finally {
    tracker.summary(skip);
    isRunning = false;
  }
};

// ── Graceful shutdown ─────────────────────────────────────────
let isShuttingDown = false;
let scheduledTask = null;

const shutdown = () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n[scheduler] Received shutdown signal. Stopping scheduler...');
  if (scheduledTask) {
    scheduledTask.stop();
    console.log('[scheduler] Cron job stopped.');
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ── Start scheduler ───────────────────────────────────────────
const startScheduler = () => {
  console.log(`[scheduler] LeetCode sync scheduled: "${CONFIG.cronSchedule}"`);

  scheduledTask = cron.schedule(CONFIG.cronSchedule, () => {
    runSync().catch((err) => console.error('[scheduler] Unexpected error during sync:', err));
  });

  if (CONFIG.runOnStart) {
    console.log('[scheduler] LEETCODE_RUN_ON_START=true — running initial sync in 5s...');
    setTimeout(() => {
      runSync().catch((err) => console.error('[scheduler] Unexpected error during initial sync:', err));
    }, 5000);
  }
};

export { startScheduler, runSync };