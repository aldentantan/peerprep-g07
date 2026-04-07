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
    this.updated = 0;
    this.skipped = 0;
    this.failed = 0;
    this.retried = 0;
    this.startTime = Date.now();
  }

  log(status, title, extra = '') {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const icons = { inserted: '✅', updated: '🔧', skipped: '⏭ ', failed: '❌', retry: '🔄', warn: '⚠️ ' };
    console.log(`[${elapsed}s] ${icons[status] || '  '} ${title} ${extra}`);
  }

  summary(nextSkip) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log('\n────────────────────────────────────────');
    console.log(`📊 Sync complete in ${elapsed}s`);
    console.log(`   ✅ Inserted  : ${this.inserted}`);
    console.log(`   🔧 Updated   : ${this.updated}`);
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

const decodeHtmlEntities = (text = '') =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const normalizeText = (text = '') =>
  text
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const htmlToPlainText = (html = '') =>
  normalizeText(
    decodeHtmlEntities(
      html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|section|article|h[1-6]|ul|ol|li|pre|blockquote)>/gi, '\n')
        .replace(/<li[^>]*>/gi, '- ')
        .replace(/<[^>]*>/g, '')
    )
  );

const LEETCODE_LINK_PREFIX = 'https://leetcode.com/problems/';
const PLACEHOLDER_TEXT_REGEX = /see leetcode|not provided by leetcode/i;
const LEETCODE_FALLBACK_DESCRIPTION_REGEX = /^LeetCode problem:/i;

const findLabelIndex = (text, label, startIndex = 0) => {
  const matcher = new RegExp(`${label}:`, 'i');
  const match = matcher.exec(text.slice(startIndex));
  return match ? startIndex + match.index : -1;
};

const extractLabelValue = (text, label, nextLabels = []) => {
  const start = findLabelIndex(text, label);
  if (start === -1) return null;

  const valueStart = start + label.length + 1;
  const nextIndexes = nextLabels
    .map((nextLabel) => findLabelIndex(text, nextLabel, valueStart))
    .filter((index) => index !== -1);

  const end = nextIndexes.length > 0 ? Math.min(...nextIndexes) : text.length;
  return normalizeText(text.slice(valueStart, end));
};

const splitProblemSections = (plainText = '') => {
  const lines = plainText.split('\n').map((line) => line.trim());
  const descriptionLines = [];
  const constraintLines = [];
  const exampleBlocks = [];
  let currentSection = 'description';
  let currentExample = [];

  const flushExample = () => {
    if (currentExample.length > 0) {
      exampleBlocks.push(normalizeText(currentExample.join('\n')));
      currentExample = [];
    }
  };

  for (const line of lines) {
    if (/^Example\s+\d+:?$/i.test(line)) {
      flushExample();
      currentSection = 'example';
      currentExample.push(line);
      continue;
    }

    if (/^Constraints:?$/i.test(line)) {
      flushExample();
      currentSection = 'constraints';
      continue;
    }

    if (/^(Follow[- ]up|Note|Notes):?$/i.test(line)) {
      flushExample();
      currentSection = 'other';
      continue;
    }

    if (!line) {
      if (currentSection === 'example' && currentExample.length > 0) {
        currentExample.push('');
      } else if (currentSection === 'description' && descriptionLines.length > 0) {
        descriptionLines.push('');
      } else if (currentSection === 'constraints' && constraintLines.length > 0) {
        constraintLines.push('');
      }
      continue;
    }

    if (currentSection === 'example') {
      currentExample.push(line);
      continue;
    }

    if (currentSection === 'constraints') {
      constraintLines.push(line.replace(/^- /, ''));
      continue;
    }

    if (currentSection === 'description') {
      descriptionLines.push(line);
    }
  }

  flushExample();

  return {
    description: normalizeText(descriptionLines.join('\n')),
    constraints: normalizeText(constraintLines.join('\n')),
    exampleBlocks,
  };
};

const parseExampleBlock = (exampleBlock) => {
  const normalizedBlock = normalizeText(exampleBlock.replace(/^Example\s+\d+:?\s*/i, ''));
  const input = extractLabelValue(normalizedBlock, 'Input', ['Output', 'Explanation']);
  const output = extractLabelValue(normalizedBlock, 'Output', ['Explanation']);
  const explanation = extractLabelValue(normalizedBlock, 'Explanation');

  if (!input && !output && !explanation) {
    return null;
  }

  if (!input || !output) {
    return null;
  }

  return {
    input,
    output,
    ...(explanation ? { explanation } : {}),
  };
};

const normalizeDetailPayload = (detail, problem = {}) => {
  const detailObject = detail && typeof detail === 'object' ? detail : {};
  const nestedQuestion =
    detailObject.question && typeof detailObject.question === 'object'
      ? detailObject.question
      : {};

  return {
    title:
      detailObject.questionTitle ||
      nestedQuestion.title ||
      detailObject.title ||
      problem.title,
    difficulty:
      detailObject.difficulty ||
      nestedQuestion.difficulty ||
      problem.difficulty,
    topicTags:
      detailObject.topicTags ||
      nestedQuestion.topicTags ||
      problem.topicTags ||
      [],
    htmlContent:
      (typeof detailObject.question === 'string' && detailObject.question) ||
      nestedQuestion.content ||
      nestedQuestion.translatedContent ||
      detailObject.content ||
      detailObject.translatedContent ||
      '',
    exampleTestcases:
      detailObject.exampleTestcases ||
      nestedQuestion.exampleTestcases ||
      '',
    exampleTestcaseList:
      detailObject.exampleTestcaseList ||
      nestedQuestion.exampleTestcaseList ||
      [],
    sampleTestCase:
      detailObject.sampleTestCase ||
      nestedQuestion.sampleTestCase ||
      '',
    link:
      detailObject.link ||
      nestedQuestion.link ||
      null,
  };
};

const buildQuestionPayload = ({ detail, problem, slug }) => {
  const question = normalizeDetailPayload(detail, problem);
  const plainText = htmlToPlainText(question.htmlContent);
  const sections = splitProblemSections(plainText);
  const parsedExamples = sections.exampleBlocks.map(parseExampleBlock).filter(Boolean);

  return {
    title: question.title || problem.title,
    description: sections.description || plainText || null,
    constraints: sections.constraints || null,
    testCases: parsedExamples,
    leetcodeLink: question.link || `${LEETCODE_LINK_PREFIX}${slug}/`,
    difficulty: mapDifficulty(question.difficulty || problem.difficulty),
    topics: mapTopics(question.topicTags || problem.topicTags || []),
  };
};

const hasMeaningfulDescription = (description) => {
  const normalizedDescription = normalizeText(description || '');
  return Boolean(
    normalizedDescription &&
    !LEETCODE_FALLBACK_DESCRIPTION_REGEX.test(normalizedDescription) &&
    !PLACEHOLDER_TEXT_REGEX.test(normalizedDescription)
  );
};

const hasMeaningfulTestCaseValue = (value) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    const normalizedValue = normalizeText(value);
    return Boolean(normalizedValue) && !PLACEHOLDER_TEXT_REGEX.test(normalizedValue);
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  return true;
};

const hasMeaningfulTestCases = (testCases) =>
  Array.isArray(testCases) &&
  testCases.some(
    (testCase) =>
      hasMeaningfulTestCaseValue(testCase?.input) &&
      hasMeaningfulTestCaseValue(testCase?.output)
  );

const hasRequiredQuestionContent = (payload) =>
  hasMeaningfulDescription(payload.description) && hasMeaningfulTestCases(payload.testCases);

const hasPlaceholderDetails = (row) =>
  !hasMeaningfulDescription(row.description) || !hasMeaningfulTestCases(row.test_cases);

const cleanupIncompleteLeetCodeQuestions = async () => {
  const result = await pool.query(
    `DELETE FROM questions
      WHERE LOWER(COALESCE(leetcode_link, '')) LIKE '${LEETCODE_LINK_PREFIX}%'
        AND (
          description IS NULL
          OR BTRIM(description) = ''
          OR description ~* '^LeetCode problem:'
          OR description ~* 'see leetcode'
          OR test_cases IS NULL
          OR CASE
            WHEN jsonb_typeof(test_cases) = 'array' THEN jsonb_array_length(test_cases)
            ELSE 0
          END = 0
          OR NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(
              CASE
                WHEN jsonb_typeof(test_cases) = 'array' THEN test_cases
                ELSE '[]'::jsonb
              END
            ) AS test_case
            WHERE BTRIM(COALESCE(test_case->>'input', '')) <> ''
              AND BTRIM(COALESCE(test_case->>'output', '')) <> ''
              AND COALESCE(test_case->>'input', '') !~* 'see leetcode|not provided by leetcode'
              AND COALESCE(test_case->>'output', '') !~* 'see leetcode|not provided by leetcode'
          )
        )
      RETURNING question_id, title`
  );

  return result.rows;
};

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
const getExistingQuestion = async (title) => {
  try {
    const result = await pool.query(
      'SELECT * FROM questions WHERE title = $1 LIMIT 1',
      [title]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('[scheduler] Duplicate check failed:', err.message);
    return null;
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

const updateQuestionDetails = async (questionId, payload) => {
  const result = await pool.query(
    `UPDATE questions
        SET title = $1,
            description = $2,
            constraints = $3,
            test_cases = $4,
            leetcode_link = $5,
            difficulty = $6,
            topics = $7
      WHERE question_id = $8
      RETURNING question_id, title`,
    [
      payload.title,
      payload.description,
      payload.constraints || null,
      JSON.stringify(payload.testCases),
      payload.leetcodeLink,
      payload.difficulty,
      payload.topics,
      questionId,
    ]
  );

  return result.rows[0];
};

// ── Main sync job ─────────────────────────────────────────────
let isRunning = false;
let pendingRunRequested = false;

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
    const removedQuestions = await cleanupIncompleteLeetCodeQuestions();
    if (removedQuestions.length > 0) {
      console.log(`[scheduler] Removed ${removedQuestions.length} incomplete LeetCode question(s) from the DB.`);
    }

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
        const existingQuestion = await getExistingQuestion(title);
        if (existingQuestion && !hasPlaceholderDetails(existingQuestion)) {
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
        const payload = buildQuestionPayload({ detail, problem, slug });
        if (!hasRequiredQuestionContent(payload)) {
          tracker.skipped++;
          tracker.log('skipped', title, '(missing description or test cases)');
          totalProcessed++;
          await sleep(CONFIG.delayBetweenQuestions);
          continue;
        }

        try {
          if (existingQuestion) {
            const updated = await updateQuestionDetails(existingQuestion.question_id, payload);
            tracker.updated++;
            tracker.log('updated', payload.title, `(ID: ${updated.question_id})`);
          } else {
            const inserted = await insertQuestion(payload);
            tracker.inserted++;
            tracker.log('inserted', payload.title, `(ID: ${inserted.question_id})`);
          }
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
    const shouldRunQueuedSync = pendingRunRequested && !isShuttingDown;
    pendingRunRequested = false;
    isRunning = false;

    if (shouldRunQueuedSync) {
      console.log('[scheduler] Starting one queued sync after the active run completed.');
      setTimeout(() => {
        triggerSync('queued follow-up');
      }, 0);
    }
  }
};

const triggerSync = (source = 'scheduler') => {
  if (isShuttingDown) {
    console.log(`[scheduler] Ignoring ${source} sync request because shutdown is in progress.`);
    return;
  }

  if (isRunning) {
    if (!pendingRunRequested) {
      pendingRunRequested = true;
      console.log(`[scheduler] Sync requested by ${source} while another run is active. Queued one follow-up run.`);
    }
    return;
  }

  runSync().catch((err) => console.error(`[scheduler] Unexpected error during ${source} sync:`, err));
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
    triggerSync('cron');
  });

  if (CONFIG.runOnStart) {
    console.log('[scheduler] LEETCODE_RUN_ON_START=true — running initial sync in 5s...');
    setTimeout(() => {
      triggerSync('startup');
    }, 5000);
  }
};

export { cleanupIncompleteLeetCodeQuestions, startScheduler, runSync };
