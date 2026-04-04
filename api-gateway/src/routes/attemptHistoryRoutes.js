import { Router } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { verifyToken } from '../middleware/authMiddleware.js';

dotenv.config();

const router = Router();
const ATTEMPT_HISTORY_SERVICE_URL = process.env.ATTEMPT_HISTORY_SERVICE_URL || 'http://localhost:3005';

router.get('/me', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(`${ATTEMPT_HISTORY_SERVICE_URL}/attempts/me`, {
      params: req.query,
      headers: { authorization: `Bearer ${req.token}` },
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Attempt history service unavailable' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const response = await axios.post(
      `${ATTEMPT_HISTORY_SERVICE_URL}/attempts`,
      req.body,
      { headers: { authorization: `Bearer ${req.token}` } },
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Attempt history service unavailable' });
  }
});

export default router;
