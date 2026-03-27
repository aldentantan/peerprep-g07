import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getUserByEmail as _getUserByEmail } from '../database/query.js';
import dotenv from 'dotenv';

dotenv.config();

export async function handleLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await _getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const passwordMatch = bcrypt.compareSync(password, user.hashed_password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '3d' },
    );

    return res.status(200).json({ token });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ error: 'Failed to login' });
  }
}

export async function verifyUserRole(req, res) {
  try {
    const { email } = req.user;
    const user = await _getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({ role: user.access_role });
  } catch (error) {
    console.error('Error verifying user role:', error);
    return res.status(500).json({ error: 'Failed to verify user role' });
  }
}
