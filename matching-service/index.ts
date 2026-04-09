import express from 'express';
import { WebSocketServer } from 'ws';
import { cleanupTimedOutUsers, reconcilePendingMatches } from './src/controllers/matchingController';
import { pollAllQueues } from './src/matching-worker/matchingWorker';
import { ensureMatchEventConsumerGroup, startMatchSubscriber } from './src/redis/redisSubscriber';
import { handleWsConnection } from './src/routes/matchingRoutes';

const PORT = process.env.PORT || 3002;

const app = express();
app.use(express.json());

async function startBackgroundWorkers() {
  await reconcilePendingMatches();
  await ensureMatchEventConsumerGroup();
  setInterval(() => pollAllQueues(), 7500);
  setInterval(() => cleanupTimedOutUsers(), 2000);
  startMatchSubscriber();
}

const server = app.listen(PORT, () => {
  console.log(`Matching service listening on port ${PORT}`);
  startBackgroundWorkers().catch((error) => {
    console.error('Failed to start matching background workers:', error);
  });
});

const wss = new WebSocketServer({ server });
wss.on('connection', handleWsConnection);
