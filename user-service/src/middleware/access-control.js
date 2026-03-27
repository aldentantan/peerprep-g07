import jwt from 'jsonwebtoken';
import { getUserByEmail as _getUserByEmail } from '../database/query.js';
import dotenv from 'dotenv';

dotenv.config();

export async function verifyAccessToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization failed' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authorization failed' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await _getUserByEmail(decoded.email);

    if (!user) {
      return res.status(401).json({ error: 'Authorization failed' });
    }
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.access_role,
    };
    
    next();
  } catch (error) {
    console.error('Error verifying access token:', error);
    return res.status(501).json({ error: 'Unable to verify access token' });
  }
}

export function verifyIsRootAdmin(req, res, next) {
  try {
    if (req.user.role !== 'root-admin') {
      return res
        .status(403)
        .json({ error: 'Forbidden: insufficient permissions' });
    }
    next();
  } catch (error) {
    console.error('Error verifying admin role:', error);
    return res.status(500).json({ error: 'Unable to verify admin role' });
  }
}
