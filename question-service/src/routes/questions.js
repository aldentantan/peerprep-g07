import { Router } from 'express';
import { createQuestion, getQuestions, getQuestionById, updateQuestion, deleteQuestion } from '../controllers/questionController.js';

const questionRoutes = Router();
// ── Public routes ────────────────────────────────────────────
// GET /questions?topic=Arrays&difficulty=Easy
questionRoutes.get('/', getQuestions);

// GET /questions/:id
questionRoutes.get('/:id', getQuestionById);

// ── Admin-only routes ────────────────────────────────────────
// POST /questions
questionRoutes.post('/', createQuestion);

// PUT /questions/:id
questionRoutes.put('/:id', updateQuestion);

// DELETE /questions/:id
questionRoutes.delete('/:id', deleteQuestion);

export default questionRoutes;
