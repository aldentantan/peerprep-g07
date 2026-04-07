import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import matchingRoutes from './routes/matchingRoutes.js';
import collaborationRoutes from './routes/collaborationRoutes.js';
import executionRoutes from './routes/executionRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;
const MATCHING_SERVICE_URL = process.env.MATCHING_SERVICE_URL || 'http://localhost:3002';
const COLLAB_WS_URL = process.env.COLLAB_WS_URL || 'ws://localhost:8081';

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
app.use('/api/collab', collaborationRoutes);
app.use('/api/execute', executionRoutes);

// WebSocket proxy to matching service
const matchingWsProxy = createProxyMiddleware({
  target: MATCHING_SERVICE_URL,
  changeOrigin: true,
  ws: true,
});

const collabYjsWsProxy = createProxyMiddleware({
  target: COLLAB_WS_URL,
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/ws/yjs': '/yjs' },
});

const collabChatWsProxy = createProxyMiddleware({
  target: COLLAB_WS_URL,
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/ws/chat': '/chat' },
});

app.use('/ws/match', matchingWsProxy);
app.use('/ws/yjs', collabYjsWsProxy);
app.use('/ws/chat', collabChatWsProxy);

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

// Proxy WebSocket upgrade requests
server.on('upgrade', (req, socket, head) => {
  if (req.url?.startsWith('/ws/yjs')) {
    collabYjsWsProxy.upgrade(req, socket, head);
  } else if (req.url?.startsWith('/ws/chat')) {
    collabChatWsProxy.upgrade(req, socket, head);
  } else if (req.url?.startsWith('/ws/match')) {
    matchingWsProxy.upgrade(req, socket, head);
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
  console.log(`             GET  http://localhost:${PORT}/api/questions/random?topic=Arrays&difficulty=Medium`);
  console.log(`  Collab:    GET  http://localhost:${PORT}/api/collab/room/:roomId`);
  console.log(`  Matching:  WS   ws://localhost:${PORT}/ws/match`);
  console.log(`  Yjs:       WS   ws://localhost:${PORT}/ws/yjs/:roomId`);
  console.log(`  Chat:      WS   ws://localhost:${PORT}/ws/chat/:roomId`);
});
