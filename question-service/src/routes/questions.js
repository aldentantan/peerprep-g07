import { Router } from 'express';
import { createQuestion, getQuestions, getQuestionById, updateQuestion, deleteQuestion } from '../controllers/questionController.js';
import { requireAdmin } from '../middleware/auth.js';

const questionRoutes = Router();
// ── Public routes ────────────────────────────────────────────
// GET /questions?topic=Arrays&difficulty=Easy
questionRoutes.get('/', getQuestions);

// GET /questions/:id
questionRoutes.get('/:id', getQuestionById);

// ── Admin-only routes ────────────────────────────────────────
// POST /questions
questionRoutes.post('/', requireAdmin, createQuestion);

// PUT /questions/:id
questionRoutes.put('/:id', requireAdmin, updateQuestion);

// DELETE /questions/:id
questionRoutes.delete('/:id', requireAdmin, deleteQuestion);

export default questionRoutes;
