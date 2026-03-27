import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import matchingRoutes from './routes/matchingRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;
const MATCHING_SERVICE_URL = process.env.MATCHING_SERVICE_URL || 'http://localhost:3002';

app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[Gateway] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'api-gateway' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/match', matchingRoutes);

// WebSocket proxy to matching service
const wsProxy = createProxyMiddleware({
  target: MATCHING_SERVICE_URL,
  changeOrigin: true,
  ws: true,
});
app.use('/ws', wsProxy);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.path} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Gateway Error]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const server = http.createServer(app);

// Proxy WebSocket upgrade requests to matching service
server.on('upgrade', (req, socket, head) => {
  if (req.url?.startsWith('/ws')) {
    wsProxy.upgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`  Health:    GET  http://localhost:${PORT}/api/health`);
  console.log(`  Auth:      POST http://localhost:${PORT}/api/auth/signup`);
  console.log(`             POST http://localhost:${PORT}/api/auth/login`);
  console.log(`  Users:     GET  http://localhost:${PORT}/api/users/me`);
  console.log(`  Questions: GET  http://localhost:${PORT}/api/questions`);
  console.log(`  Matching:  WS   ws://localhost:${PORT}/ws/match`);
});
