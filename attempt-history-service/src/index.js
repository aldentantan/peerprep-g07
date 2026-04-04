import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { ensureDatabaseExists } from './db/bootstrap.js';
import { query } from './db/index.js';
import { ensureSchema } from './db/schema.js';
import attemptRoutes from './routes/attemptRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    return res.status(200).json({ status: 'ok', service: 'attempt-history-service', db: 'connected' });
  } catch (error) {
    return res.status(503).json({ status: 'error', service: 'attempt-history-service', db: 'disconnected' });
  }
});

app.use('/attempts', attemptRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.path} not found.` });
});

app.use((error, req, res, next) => {
  console.error('[Attempt History Service][Unhandled Error]', error);
  res.status(500).json({ error: 'Internal Server Error', message: error.message });
});

async function startServer() {
  await ensureDatabaseExists();

  const maxRetries = 10;
  const retryDelay = 3000;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await query('SELECT 1');
      await ensureSchema();
      console.log('Attempt history database connected successfully.');
      break;
    } catch (error) {
      console.log(`Waiting for attempt history database... (attempt ${attempt}/${maxRetries})`);
      if (attempt === maxRetries) {
        console.error('Could not connect to the attempt history database. Exiting.');
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  app.listen(PORT, () => {
    console.log(`Attempt History Service running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start attempt history service:', error);
  process.exit(1);
});
