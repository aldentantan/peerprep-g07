import pool from '../db/index.js';
import { uploadImage, deleteImages } from '../services/s3Service.js';

const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

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

const buildQuestionResponse = (question) => {
  const missingAssets = question.imageUrls.filter((url) => !url || url.trim() === '');
  const response = { question };

  if (missingAssets.length > 0) {
    response.assetWarning = `${missingAssets.length} image URL(s) are empty or unavailable.`;
  }

  return response;
};

// ────────────────────────────────────────────────────────────
// Helper: validate and upload image files to S3
// Returns array of S3 URLs
// ────────────────────────────────────────────────────────────
const handleImageUploads = async (files) => {
  if (!files || files.length === 0) return [];
 
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const invalidFiles = files.filter(f => !allowedTypes.includes(f.mimetype));
  if (invalidFiles.length > 0) {
    throw new Error(`Invalid file type(s): ${invalidFiles.map(f => f.originalname).join(', ')}. Allowed: jpeg, png, gif, webp.`);
  }
 
  const maxSize = 5 * 1024 * 1024; // 5MB
  const oversizedFiles = files.filter(f => f.size > maxSize);
  if (oversizedFiles.length > 0) {
    throw new Error(`File(s) too large: ${oversizedFiles.map(f => f.originalname).join(', ')}. Max size is 5MB.`);
  }
 
  const uploadPromises = files.map(f => uploadImage(f.buffer, f.originalname, f.mimetype));
  return Promise.all(uploadPromises);
};

// ────────────────────────────────────────────────────────────
// POST /questions  (Admin only)
// ────────────────────────────────────────────────────────────
const createQuestion = async (req, res) => {
  const {
    title,
    description,
    constraints,
    leetcodeLink,
    difficulty,
  } = req.body;

  let topics, testCases;
  try {
    topics = typeof req.body.topics === 'string' ? JSON.parse(req.body.topics) : req.body.topics;
    testCases = typeof req.body.testCases === 'string' ? JSON.parse(req.body.testCases) : req.body.testCases;
  } catch {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'topics and testCases must be valid JSON arrays.',
    });
  }

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
  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`,
    });
  }

    // Upload images to S3 if any were attached
  let imageUrls = [];
  try {
    imageUrls = await handleImageUploads(req.files);
  } catch (err) {
    return res.status(400).json({ error: 'Validation Error', message: err.message });
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
    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`,
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

const getRandomQuestion = async (req, res) => {
  const topic = typeof req.query.topic === 'string' ? req.query.topic.trim() : '';
  const { difficulty } = req.query;

  if (!topic || !difficulty) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'topic and difficulty query parameters are required.',
    });
  }

  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`,
    });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM questions
       WHERE difficulty = $1
         AND $2 = ANY(topics)
       ORDER BY RANDOM()
       LIMIT 1`,
      [difficulty, topic]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: `No question found for topic "${topic}" with difficulty "${difficulty}".`,
      });
    }

    const question = formatQuestion(result.rows[0]);
    return res.status(200).json(buildQuestionResponse(question));
  } catch (err) {
    console.error('[getRandomQuestion]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

// ────────────────────────────────────────────────────────────
// GET /questions/topics  (Public)
// Returns all unique topics currently present in the DB.
// ────────────────────────────────────────────────────────────
const getTopics = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT topic
         FROM (
           SELECT unnest(topics) AS topic
           FROM questions
         ) AS topic_list
        WHERE topic IS NOT NULL AND topic <> ''
        ORDER BY topic ASC`
    );

    const topics = result.rows.map((row) => row.topic);

    return res.status(200).json({
      count: topics.length,
      topics,
    });
  } catch (err) {
    console.error('[getTopics]', err);
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

    return res.status(200).json(buildQuestionResponse(question));
  } catch (err) {
    console.error('[getQuestionById]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

// ────────────────────────────────────────────────────────────
// PUT /questions/:id  (Admin only)
// - New image files are uploaded to S3 and appended
// - existingImageUrls (JSON array string) specifies which old
//   URLs to keep — any not included are deleted from S3
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
    leetcodeLink,
    difficulty,
  } = req.body;

  // Parse optional array fields
  let topics, testCases, existingImageUrls;
  try {
    if (req.body.topics !== undefined) {
      topics = typeof req.body.topics === 'string' ? JSON.parse(req.body.topics) : req.body.topics;
    }
    if (req.body.testCases !== undefined) {
      testCases = typeof req.body.testCases === 'string' ? JSON.parse(req.body.testCases) : req.body.testCases;
    }
    // existingImageUrls = URLs the admin wants to KEEP from the current set
    if (req.body.existingImageUrls !== undefined) {
      existingImageUrls = typeof req.body.existingImageUrls === 'string'
        ? JSON.parse(req.body.existingImageUrls)
        : req.body.existingImageUrls;
    }
  } catch {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'topics, testCases, and existingImageUrls must be valid JSON arrays.',
    });
  }

  // Validate fields if they are provided
  if (difficulty) {
    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`,
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

    // ── Image handling ───────────────────────────────────────
    // 1. Upload any new image files to S3
    let newlyUploadedUrls = [];
    try {
      newlyUploadedUrls = await handleImageUploads(req.files);
    } catch (err) {
      return res.status(400).json({ error: 'Validation Error', message: err.message });
    }
 
    // 2. Determine final image_urls for the DB
    let finalImageUrls;
    if (existingImageUrls !== undefined) {
      // Admin explicitly specified which old URLs to keep
      // Delete any old URLs that are no longer in the keep list
      const removedUrls = current.image_urls.filter(url => !existingImageUrls.includes(url));
      if (removedUrls.length > 0) {
        await deleteImages(removedUrls).catch(e => console.error('[updateQuestion] S3 delete failed:', e));
      }
      // Final = kept old URLs + newly uploaded URLs
      finalImageUrls = [...existingImageUrls, ...newlyUploadedUrls];
    } else if (newlyUploadedUrls.length > 0) {
      // No existingImageUrls specified — just append new uploads to existing
      finalImageUrls = [...current.image_urls, ...newlyUploadedUrls];
    } else {
      // No image changes at all — keep existing
      finalImageUrls = current.image_urls;
    }

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
        finalImageUrls,
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
// Deletes the question AND all its S3 images
// ────────────────────────────────────────────────────────────
const deleteQuestion = async (req, res) => {
  const { id } = req.params;

  if (isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'Bad Request', message: 'Question ID must be a number.' });
  }

  try {

    const existing = await pool.query('SELECT * FROM questions WHERE question_id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: `Question with ID ${id} not found.` });
    }

    const { title, image_urls } = existing.rows[0];
    // Delete all S3 images first
    if (image_urls && image_urls.length > 0) {
      await deleteImages(image_urls).catch(e => console.error('[deleteQuestion] S3 cleanup failed:', e));
    }
 
    // Delete the question from DB
    await pool.query('DELETE FROM questions WHERE question_id = $1', [id]);

    return res.status(200).json({
      message: `Question "${title}" (ID: ${id}) and ${image_urls.length} image(s) deleted successfully.`,
    });
  } catch (err) {
    console.error('[deleteQuestion]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

export {
  createQuestion,
  getQuestions,
  getTopics,
  getRandomQuestion,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
};
