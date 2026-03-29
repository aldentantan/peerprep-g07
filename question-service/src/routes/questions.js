import { Router } from 'express';
import multer from 'multer';
import { createQuestion, getQuestions, getTopics, getQuestionById, updateQuestion, deleteQuestion } from '../controllers/questionController.js';
import { requireAdmin } from '../middleware/auth.js';
import {
  uploadQuestionImages,
  deleteQuestionImage,
} from '../controllers/imageController.js';

const questionRoutes = Router();

// Multer config — store files in memory before uploading to S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
});

// ── Public routes ────────────────────────────────────────────
// GET /questions?topic=Arrays&difficulty=Easy
questionRoutes.get('/', getQuestions);

// GET /questions/topics
questionRoutes.get('/topics', getTopics);

// GET /questions/:id
questionRoutes.get('/:id', getQuestionById);

// ── Admin-only routes ────────────────────────────────────────
// POST /questions
questionRoutes.post('/', requireAdmin, upload.array('images', 10), createQuestion);

// PUT /questions/:id
questionRoutes.put('/:id', requireAdmin, upload.array('images', 10), updateQuestion);

// DELETE /questions/:id
questionRoutes.delete('/:id', requireAdmin, deleteQuestion);

// ── Standalone Image routes (Admin only) ─────────────────────────────────
// POST   /questions/:id/images  — upload images (multipart/form-data, field: "images")
// DELETE /questions/:id/images  — delete a specific image (body: { imageUrl })
questionRoutes.post('/:id/images', requireAdmin, upload.array('images', 10), uploadQuestionImages);
questionRoutes.delete('/:id/images', requireAdmin, deleteQuestionImage);

export default questionRoutes;
