import express from 'express';
import { verifyAccessToken } from '../middleware/access-control.js';
import { handleLogin, verifyUserRole } from '../controllers/auth-controller.js';

const router = express.Router();

router.post('/login', handleLogin);

router.get('/internal/role-check', verifyAccessToken, verifyUserRole);

export default router;
