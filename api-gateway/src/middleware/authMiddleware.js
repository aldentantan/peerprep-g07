import jwt from 'jsonwebtoken';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3000';

/**
 * Verifies the JWT token from the Authorization header.
 * Attaches decoded user info to req.user.
 */
export function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header is required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Bearer token is required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Verifies the user has an admin or root-admin role by calling user-service.
 * Must be used after verifyToken.
 */
export async function verifyAdmin(req, res, next) {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/auth/internal/role-check`, {
      headers: { Authorization: `Bearer ${req.token}` },
    });

    const { role } = response.data;
    if (role !== 'admin' && role !== 'root-admin') {
      return res.status(403).json({ error: 'Forbidden: admin access required' });
    }

    req.user.role = role;
    next();
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Failed to verify user role' });
  }
}
