import { query } from '../db/index.js';

const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

function normalizeTopics(topics) {
  if (Array.isArray(topics)) {
    return topics
      .map((topic) => (typeof topic === 'string' ? topic.trim() : ''))
      .filter((topic) => topic !== '');
  }

  if (typeof topics === 'string') {
    try {
      return normalizeTopics(JSON.parse(topics));
    } catch {
      return topics
        .split(',')
        .map((topic) => topic.trim())
        .filter((topic) => topic !== '');
    }
  }

  return [];
}

function normalizeImageUrls(imageUrls) {
  if (Array.isArray(imageUrls)) {
    return imageUrls
      .map((imageUrl) => (typeof imageUrl === 'string' ? imageUrl.trim() : ''))
      .filter((imageUrl) => imageUrl !== '');
  }

  if (typeof imageUrls === 'string') {
    try {
      return normalizeImageUrls(JSON.parse(imageUrls));
    } catch {
      const trimmedImageUrl = imageUrls.trim();
      return trimmedImageUrl === '' ? [] : [trimmedImageUrl];
    }
  }

  return [];
}

function toIsoString(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizeComparisonText(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return `${value}`
    .replace(/\r\n/g, '\n')
    .trim()
    .replace(/[ \t]+/g, ' ');
}

function normalizeComparisonDifficulty(value) {
  return normalizeComparisonText(value).toLowerCase();
}

function normalizeTopicsForComparison(topics) {
  return [...new Set(normalizeTopics(topics).map((topic) => topic.toLowerCase()))].sort();
}

function topicsMatch(savedTopics, currentTopics) {
  const normalizedSavedTopics = normalizeTopicsForComparison(savedTopics);
  const normalizedCurrentTopics = normalizeTopicsForComparison(currentTopics);

  if (normalizedSavedTopics.length === 0 || normalizedCurrentTopics.length === 0) {
    return true;
  }

  if (JSON.stringify(normalizedSavedTopics) === JSON.stringify(normalizedCurrentTopics)) {
    return true;
  }

  return normalizedSavedTopics.every((topic) => normalizedCurrentTopics.includes(topic));
}

function toValidDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function snapshotVersionChanged(savedQuestionUpdatedAt, currentQuestionUpdatedAt) {
  const savedSnapshotDate = toValidDate(savedQuestionUpdatedAt);
  const currentQuestionDate = toValidDate(currentQuestionUpdatedAt);

  if (!savedSnapshotDate || !currentQuestionDate) {
    return false;
  }

  return currentQuestionDate.getTime() !== savedSnapshotDate.getTime();
}

function hasCoreQuestionChange(row, currentQuestion) {
  return (
    normalizeComparisonText(currentQuestion.title) !== normalizeComparisonText(row.question_title)
    || normalizeComparisonText(currentQuestion.description) !== normalizeComparisonText(row.question_description)
    || normalizeComparisonDifficulty(currentQuestion.difficulty)
      !== normalizeComparisonDifficulty(row.question_difficulty)
  );
}

function formatAttempt(row, archived) {
  return {
    attemptId: row.attempt_id,
    attemptNumber: Number(row.attempt_number),
    userId: row.user_id,
    username: row.username,
    question: {
      id: row.question_id,
      title: row.question_title,
      description: row.question_description,
      difficulty: row.question_difficulty,
      topics: row.question_topics || [],
      imageUrls: row.question_image_urls || [],
      archived,
    },
    submittedCode: row.submitted_code,
    submittedAt: toIsoString(row.submitted_at),
  };
}

async function fetchCurrentQuestion(questionId) {
  const questionServiceUrl = process.env.QUESTION_SERVICE_URL;
  if (!questionServiceUrl) {
    return undefined;
  }

  try {
    const response = await fetch(`${questionServiceUrl}/questions/${questionId}`);
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Question service responded with ${response.status}`);
    }

    const payload = await response.json();
    return payload.question || null;
  } catch (error) {
    console.error(`Failed to fetch question ${questionId} for archive detection:`, error);
    return undefined;
  }
}

async function buildCurrentQuestionMap(rows) {
  const uniqueQuestionIds = [...new Set(rows.map((row) => row.question_id))];
  const entries = await Promise.all(
    uniqueQuestionIds.map(async (questionId) => [questionId, await fetchCurrentQuestion(questionId)]),
  );

  return new Map(entries);
}

function isArchived(row, currentQuestion) {
  if (currentQuestion === undefined) {
    return false;
  }

  if (currentQuestion === null) {
    return true;
  }

  if (snapshotVersionChanged(row.question_updated_at, currentQuestion.updatedAt)) {
    return true;
  }

  if (hasCoreQuestionChange(row, currentQuestion)) {
    return true;
  }

  return !topicsMatch(row.question_topics, currentQuestion.topics);
}

async function getAttemptNumber(userId, questionId, attemptId) {
  const result = await query(
    `SELECT numbered_attempts.attempt_number
     FROM (
       SELECT
         attempt_id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, question_id
           ORDER BY submitted_at ASC, attempt_id ASC
         ) AS attempt_number
       FROM question_attempt_history
       WHERE user_id = $1
         AND question_id = $2
     ) AS numbered_attempts
     WHERE numbered_attempts.attempt_id = $3`,
    [userId, questionId, attemptId],
  );

  return result.rows[0]?.attempt_number ?? 1;
}

export async function createAttempt(req, res) {
  const {
    questionId,
    questionTitle,
    questionDescription,
    questionDifficulty,
    questionTopics,
    questionImageUrls,
    questionUpdatedAt,
    submittedCode,
  } = req.body;

  const parsedQuestionId = Number.parseInt(`${questionId}`, 10);
  const normalizedTopics = normalizeTopics(questionTopics);
  const normalizedImageUrls = normalizeImageUrls(questionImageUrls);
  const normalizedQuestionUpdatedAt =
    questionUpdatedAt === undefined || questionUpdatedAt === null || `${questionUpdatedAt}`.trim() === ''
      ? null
      : toValidDate(questionUpdatedAt);

  if (!Number.isInteger(parsedQuestionId)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'questionId must be a number.',
    });
  }

  if (typeof questionTitle !== 'string' || questionTitle.trim() === '') {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'questionTitle is required.',
    });
  }

  if (typeof questionDescription !== 'string' || questionDescription.trim() === '') {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'questionDescription is required.',
    });
  }

  if (!VALID_DIFFICULTIES.includes(questionDifficulty)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: `questionDifficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`,
    });
  }

  if (normalizedTopics.length === 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'questionTopics must contain at least one topic.',
    });
  }

  if (questionUpdatedAt !== undefined && questionUpdatedAt !== null && `${questionUpdatedAt}`.trim() !== '' && !normalizedQuestionUpdatedAt) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'questionUpdatedAt must be a valid timestamp when provided.',
    });
  }

  if (typeof submittedCode !== 'string') {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'submittedCode must be a string.',
    });
  }

  if (submittedCode.trim() === '') {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'submittedCode cannot be empty.',
    });
  }

  try {
    const result = await query(
      `INSERT INTO question_attempt_history (
         user_id,
         username,
         question_id,
         question_title,
         question_description,
         question_difficulty,
         question_topics,
         question_image_urls,
         question_updated_at,
         submitted_code
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        `${req.user.id}`,
        `${req.user.username}`,
        parsedQuestionId,
        questionTitle.trim(),
        questionDescription.trim(),
        questionDifficulty,
        normalizedTopics,
        normalizedImageUrls,
        normalizedQuestionUpdatedAt ? normalizedQuestionUpdatedAt.toISOString() : null,
        submittedCode,
      ],
    );

    const insertedAttempt = result.rows[0];
    const attemptNumber = await getAttemptNumber(
      `${req.user.id}`,
      parsedQuestionId,
      insertedAttempt.attempt_id,
    );

    return res.status(201).json({
      message: 'Attempt recorded successfully.',
      attempt: formatAttempt(
        {
          ...insertedAttempt,
          attempt_number: attemptNumber,
        },
        false,
      ),
    });
  } catch (error) {
    console.error('[attempt-history-service][createAttempt]', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
}

export async function getMyAttempts(req, res) {
  const params = [`${req.user.id}`];
  let whereClause = 'WHERE user_id = $1';

  if (req.query.questionId !== undefined) {
    const parsedQuestionId = Number.parseInt(`${req.query.questionId}`, 10);
    if (!Number.isInteger(parsedQuestionId)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'questionId must be a number when provided.',
      });
    }

    params.push(parsedQuestionId);
    whereClause += ' AND question_id = $2';
  }

  try {
    const result = await query(
      `SELECT
         *,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, question_id
           ORDER BY submitted_at ASC, attempt_id ASC
         ) AS attempt_number
       FROM question_attempt_history
       ${whereClause}
       ORDER BY submitted_at DESC, attempt_id DESC`,
      params,
    );

    const currentQuestionMap = await buildCurrentQuestionMap(result.rows);
    const attempts = result.rows.map((row) =>
      formatAttempt(row, isArchived(row, currentQuestionMap.get(row.question_id))),
    );

    return res.status(200).json({
      count: attempts.length,
      attempts,
    });
  } catch (error) {
    console.error('[attempt-history-service][getMyAttempts]', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
}
