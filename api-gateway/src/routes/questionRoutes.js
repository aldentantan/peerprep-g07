import { Router } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware.js';

dotenv.config();

const router = Router();
const QUESTION_SERVICE_URL = process.env.QUESTION_SERVICE_URL || 'http://localhost:3001';

// GET /api/questions → question-service GET /questions (public)
router.get('/', async (req, res) => {
  try {
    const response = await axios.get(`${QUESTION_SERVICE_URL}/questions`, {
      params: req.query,
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Question service unavailable' });
  }
});

// GET /api/questions/:id → question-service GET /questions/:id (public)
router.get('/:id', async (req, res) => {
  try {
    const response = await axios.get(`${QUESTION_SERVICE_URL}/questions/${req.params.id}`);
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Question service unavailable' });
  }
});

// POST /api/questions → question-service POST /questions (admin only)
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const response = await axios.post(
      `${QUESTION_SERVICE_URL}/questions`,
      req.body,
      { headers: { authorization: `Bearer ${req.token}` } },
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Question service unavailable' });
  }
});

// PUT /api/questions/:id → question-service PUT /questions/:id (admin only)
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const response = await axios.put(
      `${QUESTION_SERVICE_URL}/questions/${req.params.id}`,
      req.body,
      { headers: { authorization: `Bearer ${req.token}` } },
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Question service unavailable' });
  }
});

// DELETE /api/questions/:id → question-service DELETE /questions/:id (admin only)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const response = await axios.delete(
      `${QUESTION_SERVICE_URL}/questions/${req.params.id}`,
      { headers: { authorization: `Bearer ${req.token}` } },
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Question service unavailable' });
  }
});

export default router;
