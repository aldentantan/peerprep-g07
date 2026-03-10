import express from 'express';
import { WebSocketServer } from 'ws';
import { handleWsConnection } from './src/routes/matchingRoutes';
import { pollAllQueues } from './src/matching-worker/matchingWorker';
import { startMatchSubscriber } from './src/redis/redisSubscriber';
import { cleanupTimedOutUsers } from './src/controllers/matchingController';

const PORT = process.env.PORT || 3002;

const app = express();
app.use(express.json());

const server = app.listen(PORT, () => {
  console.log(`Matching service listening on port ${PORT}`);
});

const wss = new WebSocketServer({ server });
wss.on('connection', handleWsConnection);

setInterval(() => pollAllQueues(), 10000);
setInterval(() => cleanupTimedOutUsers(), 10000);

startMatchSubscriber();
