import pool from '../db/index.js';

// ────────────────────────────────────────────────────────────
// Helper: map DB row → clean API response object
// ────────────────────────────────────────────────────────────
const formatQuestion = (row) => ({
  questionId: row.question_id,
  title: row.title,
  description: row.description,
  constraints: row.constraints,
  testCases: row.test_cases,
  leetcodeLink: row.leetcode_link,
  difficulty: row.difficulty,
  topics: row.topics,
  imageUrls: row.image_urls,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ────────────────────────────────────────────────────────────
// POST /questions  (Admin only)
// ────────────────────────────────────────────────────────────
const createQuestion = async (req, res) => {
  const {
    title,
    description,
    constraints,
    testCases,
    leetcodeLink,
    difficulty,
    topics,
    imageUrls,
  } = req.body;

  // Validate required fields
  const missing = [];
  if (!title) missing.push('title');
  if (!description) missing.push('description');
  if (!difficulty) missing.push('difficulty');
  if (!topics || !Array.isArray(topics) || topics.length === 0) missing.push('topics');
  if (!testCases || !Array.isArray(testCases) || testCases.length === 0) missing.push('testCases');

  if (missing.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'The following required fields are missing or invalid.',
      missingFields: missing,
    });
  }

  // Validate difficulty enum
  const validDifficulties = ['Easy', 'Medium', 'Hard'];
  if (!validDifficulties.includes(difficulty)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: `difficulty must be one of: ${validDifficulties.join(', ')}`,
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO questions
         (title, description, constraints, test_cases, leetcode_link, difficulty, topics, image_urls)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title,
        description,
        constraints || null,
        JSON.stringify(testCases),
        leetcodeLink || null,
        difficulty,
        topics,
        imageUrls || [],
      ]
    );

    return res.status(201).json({
      message: 'Question created successfully.',
      question: formatQuestion(result.rows[0]),
    });
  } catch (err) {
    console.error('[createQuestion]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

// ────────────────────────────────────────────────────────────
// GET /questions  (Public)
// Retrieve by topics + difficulty
// Both filters are optional; if neither is provided all questions are returned.
// ────────────────────────────────────────────────────────────
const getQuestions = async (req, res) => {
  const { topics, difficulty } = req.query;

  const conditions = [];
  const params = [];

  if (difficulty) {
    const validDifficulties = ['Easy', 'Medium', 'Hard'];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `difficulty must be one of: ${validDifficulties.join(', ')}`,
      });
    }
    params.push(difficulty);
    conditions.push(`difficulty = $${params.length}`);
  }

  if (topics) {
    const topicList = req.query.topics.split(',').map(t => t.trim());
    params.push(topicList);
    conditions.push(`topics && $${params.length}::text[]`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT * FROM questions ${whereClause} ORDER BY question_id ASC`,
      params
    );

    // Return all assets; note missing image URLs in response
    const questions = result.rows.map(formatQuestion);
    const questionsWithAssetStatus = questions.map((q) => {
      const missingAssets = q.imageUrls.filter((url) => !url || url.trim() === '');
      if (missingAssets.length > 0) {
        return {
          ...q,
          assetWarning: `${missingAssets.length} image URL(s) are empty or unavailable.`,
        };
      }
      return q;
    });

    return res.status(200).json({
      count: questionsWithAssetStatus.length,
      questions: questionsWithAssetStatus,
    });
  } catch (err) {
    console.error('[getQuestions]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

// ────────────────────────────────────────────────────────────
// GET /questions/:id  (Public)
// ────────────────────────────────────────────────────────────
const getQuestionById = async (req, res) => {
  const { id } = req.params;

  if (isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'Bad Request', message: 'Question ID must be a number.' });
  }

  try {
    const result = await pool.query('SELECT * FROM questions WHERE question_id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: `Question with ID ${id} not found.` });
    }

    const question = formatQuestion(result.rows[0]);

    // Notify if any image URLs are missing
    const missingAssets = question.imageUrls.filter((url) => !url || url.trim() === '');
    const response = { question };
    if (missingAssets.length > 0) {
      response.assetWarning = `${missingAssets.length} image URL(s) are empty or unavailable.`;
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error('[getQuestionById]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

// ────────────────────────────────────────────────────────────
// PUT /questions/:id  (Admin only)
// ────────────────────────────────────────────────────────────
const updateQuestion = async (req, res) => {
  const { id } = req.params;

  if (isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'Bad Request', message: 'Question ID must be a number.' });
  }

  const {
    title,
    description,
    constraints,
    testCases,
    leetcodeLink,
    difficulty,
    topics,
    imageUrls,
  } = req.body;

  // Vlidate fields if they are provided
  if (difficulty) {
    const validDifficulties = ['Easy', 'Medium', 'Hard'];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `difficulty must be one of: ${validDifficulties.join(', ')}`,
      });
    }
  }

  if (topics !== undefined && (!Array.isArray(topics) || topics.length === 0)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'topics must be a non-empty array.',
    });
  }

  if (testCases !== undefined && (!Array.isArray(testCases) || testCases.length === 0)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'testCases must be a non-empty array.',
    });
  }

  try {
    // Check question exists
    const existing = await pool.query('SELECT * FROM questions WHERE question_id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: `Question with ID ${id} not found.` });
    }

    const current = existing.rows[0];

    const result = await pool.query(
      `UPDATE questions SET
         title         = $1,
         description   = $2,
         constraints   = $3,
         test_cases    = $4,
         leetcode_link = $5,
         difficulty    = $6,
         topics        = $7,
         image_urls    = $8
       WHERE question_id = $9
       RETURNING *`,
      [
        title        ?? current.title,
        description  ?? current.description,
        constraints  !== undefined ? constraints : current.constraints,
        testCases    ? JSON.stringify(testCases) : current.test_cases,
        leetcodeLink !== undefined ? leetcodeLink : current.leetcode_link,
        difficulty   ?? current.difficulty,
        topics       ?? current.topics,
        imageUrls    ?? current.image_urls,
        id,
      ]
    );

    return res.status(200).json({
      message: 'Question updated successfully.',
      question: formatQuestion(result.rows[0]),
    });
  } catch (err) {
    console.error('[updateQuestion]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

// ────────────────────────────────────────────────────────────
// DELETE /questions/:id  (Admin only)
// ────────────────────────────────────────────────────────────
const deleteQuestion = async (req, res) => {
  const { id } = req.params;

  if (isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'Bad Request', message: 'Question ID must be a number.' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM questions WHERE question_id = $1 RETURNING question_id, title',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: `Question with ID ${id} not found.` });
    }

    return res.status(200).json({
      message: `Question "${result.rows[0].title}" (ID: ${result.rows[0].question_id}) deleted successfully.`,
    });
  } catch (err) {
    console.error('[deleteQuestion]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

export {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
};