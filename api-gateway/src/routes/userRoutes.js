import { Router } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { verifyToken } from '../middleware/authMiddleware.js';

dotenv.config();

const router = Router();
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3000';

// GET /api/users/me → user-service GET /users/me 
// Get current user's profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${req.token}` },
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'User service unavailable' });
  }
});

// PATCH /api/users/me → user-service PATCH /users/me 
// Updates current user's profile
router.patch('/me', verifyToken, async (req, res) => {
  try {
    const response = await axios.patch(`${USER_SERVICE_URL}/users/me`, req.body, {
      headers: { Authorization: `Bearer ${req.token}` },
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'User service unavailable' });
  }
});

// GET /api/users/all → user-service GET /users/all (root-admin only) 
// Get all users
router.get('/all', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/users/all`, {
      headers: { Authorization: `Bearer ${req.token}` },
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'User service unavailable' });
  }
});

// PATCH /api/users/:email/role → user-service PATCH /users/:email/role (root-admin only) 
// Updates user role by email
router.patch('/:email/role', verifyToken, async (req, res) => {
  try {
    const response = await axios.patch(
      `${USER_SERVICE_URL}/users/${encodeURIComponent(req.params.email)}/role`,
      req.body,
      { headers: { Authorization: `Bearer ${req.token}` } }
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'User service unavailable' });
  }
});

export default router;
