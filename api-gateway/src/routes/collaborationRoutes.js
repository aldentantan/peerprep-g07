import { Router } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { verifyToken } from '../middleware/authMiddleware.js';

dotenv.config();

const router = Router();
const COLLAB_SERVICE_URL = process.env.COLLAB_SERVICE_URL || 'http://localhost:3003';

// GET /api/collab/my-room → collaboration-service GET /room/by-user/:username
router.get('/my-room', verifyToken, async (req, res) => {
  try {
    const username = req.user?.username  || ""
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const response = await axios.get(`${COLLAB_SERVICE_URL}/room/by-user/${encodeURIComponent(username)}`);
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Collaboration service unavailable' });
  }
});

// GET /api/collab/room/:roomId → collaboration-service GET /room/:roomId
router.get('/room/:roomId', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(`${COLLAB_SERVICE_URL}/room/${req.params.roomId}`);
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Collaboration service unavailable' });
  }
});

// DELETE /api/collab/room/:roomId/leave → collaboration-service DELETE /room/:roomId/user/:username/mapping
router.delete('/room/:roomId/leave', verifyToken, async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const response = await axios.delete(
      `${COLLAB_SERVICE_URL}/room/${encodeURIComponent(req.params.roomId)}/user/${encodeURIComponent(username)}/mapping`
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Collaboration service unavailable' });
  }
});

// Health check
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Collaboration routes are up' });
});

export default router;
