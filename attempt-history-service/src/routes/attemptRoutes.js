import { Router } from 'express';
import { createAttempt, getMyAttempts } from '../controllers/attemptController.js';
import { verifyToken } from '../middleware/auth.js';

const attemptRoutes = Router();

attemptRoutes.get('/me', verifyToken, getMyAttempts);
attemptRoutes.post('/', verifyToken, createAttempt);

export default attemptRoutes;
