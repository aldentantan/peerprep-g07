import { Router } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware.js';

dotenv.config();

const router = Router();
const QUESTION_SERVICE_URL = process.env.QUESTION_SERVICE_URL || 'http://localhost:3001';

const proxyQuestionWriteRequest = createProxyMiddleware({
  target: QUESTION_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (_, req) => req.originalUrl.replace(/^\/api/, ''),
  on: {
    proxyReq: (proxyReq, req) => {
      if (req.token) {
        proxyReq.setHeader('authorization', `Bearer ${req.token}`);
      }
    },
  },
});

// GET /api/questions → question-service GET /questions (public) 
// Fetches the list of questions, forwarding query parameters to the question service
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

// GET /api/questions/topics → question-service GET /questions/topics (public)
// Fetches all unique topics from the question service
router.get('/topics', async (req, res) => {
  try {
    const response = await axios.get(`${QUESTION_SERVICE_URL}/questions/topics`);
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Question service unavailable' });
  }
});

// GET /api/questions/:id → question-service GET /questions/:id (public) 
// Fetches a specific question by ID
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
// Creates a new question. 
router.post('/', verifyToken, verifyAdmin, proxyQuestionWriteRequest);

// PUT /api/questions/:id → question-service PUT /questions/:id (admin only) Updates a question by ID.
router.put('/:id', verifyToken, verifyAdmin, proxyQuestionWriteRequest);

// DELETE /api/questions/:id → question-service DELETE /questions/:id (admin only) 
// Deletes a question by ID.
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
