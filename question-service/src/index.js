import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import pool from './db/index.js';
import questionRoutes from './routes/questions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check ─────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok', service: 'question-service', db: 'connected' });
  } catch (err) {
    return res.status(503).json({ status: 'error', service: 'question-service', db: 'disconnected' });
  }
});

// ── Routes ───────────────────────────────────────────────────
app.use('/questions', questionRoutes);

// ── 404 handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// ── Wait for DB, then start ──────────────────────────────────
const startServer = async () => {
  const maxRetries = 10;
  const retryDelay = 3000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connected successfully.');
      break;
    } catch (err) {
      console.log(`⏳ Waiting for database... (attempt ${attempt}/${maxRetries})`);
      if (attempt === maxRetries) {
        console.error('Could not connect to database. Exiting.');
        process.exit(1);
      }
      await new Promise((res) => setTimeout(res, retryDelay));
    }
  }

  app.listen(PORT, () => {
    console.log(`Question Service running on port ${PORT}`);
    console.log(`   Health:    GET  http://localhost:${PORT}/health`);
    console.log(`   Questions: GET  http://localhost:${PORT}/questions`);
    console.log(`              GET  http://localhost:${PORT}/questions/:id`);
    console.log(`              GET  http://localhost:${PORT}/questions/?topics=Arrays,Dynamic%20Programming&difficulty=Medium`);
    console.log(`              POST http://localhost:${PORT}/questions  [Admin]`);
    console.log(`              PUT  http://localhost:${PORT}/questions/:id  [Admin]`);
    console.log(`              DELETE http://localhost:${PORT}/questions/:id  [Admin]`);
  });
};

startServer();