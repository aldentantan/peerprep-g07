import { Router } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { verifyToken } from '../middleware/authMiddleware.js';

dotenv.config();

const router = Router();
const MATCHING_SERVICE_URL = process.env.MATCHING_SERVICE_URL || 'http://localhost:3002';

// POST /api/match/queue → matching-service POST /match/queue
router.post('/queue', verifyToken, async (req, res) => {
  try {
    const response = await axios.post(`${MATCHING_SERVICE_URL}/match/queue`, {
      userId: req.user.id,
      ...req.body,
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Matching service unavailable' });
  }
});

// POST /api/match/cancel → matching-service POST /match/cancel
router.post('/cancel', verifyToken, async (req, res) => {
  try {
    const response = await axios.post(`${MATCHING_SERVICE_URL}/match/cancel`, {
      userId: req.user.id,
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Matching service unavailable' });
  }
});

// GET /api/match/status → matching-service GET /match/:userId
router.get('/status', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(`${MATCHING_SERVICE_URL}/match/${req.user.id}`);
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Matching service unavailable' });
  }
});

// Health check
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Matching routes are up' });
});

export default router;
