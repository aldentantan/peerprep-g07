import { Router } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { createProxyMiddleware } from "http-proxy-middleware";
import { verifyToken } from '../middleware/authMiddleware.js';

dotenv.config();

const router = Router();
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3000';

const proxyUserWriteRequest = createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (_, req) => req.originalUrl.replace(/^\/api/, ""),
  on: {
    proxyReq: (proxyReq, req) => {
      if (req.token) {
        proxyReq.setHeader("authorization", `Bearer ${req.token}`);
      }
    },
  },
});

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
router.patch("/me", verifyToken, proxyUserWriteRequest);

// PATCH /api/users/me/password → user-service PATCH /users/me/password 
// Updates current user's password
router.patch('/me/password', verifyToken, async (req, res) => {
  try {
    const response = await axios.patch(`${USER_SERVICE_URL}/users/me/password`, req.body, {
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

// GET /api/users/by-username/:username → user-service GET /users/by-username/:username
// Get user by username
router.get('/by-username/:username', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/users/by-username/${encodeURIComponent(req.params.username)}`, {
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

// DELETE /api/users/me → user-service DELETE /users/me 
// Deletes current user's account
router.delete('/me', verifyToken, async (req, res) => {
  try {
    const response = await axios.delete(`${USER_SERVICE_URL}/users/me`, {
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

export default router;
