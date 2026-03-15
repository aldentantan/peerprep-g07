import { Router } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3000';

// POST /api/auth/signup → user-service POST /users/ 
// Forwards signup requests to user service to create a new user
router.post('/signup', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const response = await axios.post(`${USER_SERVICE_URL}/users/`, {
      email,
      username,
      password,
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'User service unavailable' });
  }
});

// POST /api/auth/login → user-service POST /auth/login 
// Forwards login requests to user service to authenticate and return a JWT token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const response = await axios.post(`${USER_SERVICE_URL}/auth/login`, {
      email,
      password,
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
