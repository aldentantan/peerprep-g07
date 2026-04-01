import { Router } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { verifyToken } from '../middleware/authMiddleware.js';

dotenv.config();

const router = Router();
const CODE_EXECUTION_URL = process.env.CODE_EXECUTION_SERVICE_URL || 'http://localhost:3005';

// POST /api/execute → code-execution-service POST /execute
router.post('/', verifyToken, async (req, res) => {
  try {
    const { language, code, stdin } = req.body;
    const response = await axios.post(`${CODE_EXECUTION_URL}/execute`, {
      language,
      code,
      stdin,
    }, { timeout: 15000 });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Code execution service unavailable' });
  }
});

// Health check
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Execution routes are up' });
});

export default router;
