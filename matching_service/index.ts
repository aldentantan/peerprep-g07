import { pollAllQueues } from "./src/worker/matchingWorker";
import { redis } from "./src/redis/redisClient";

async function main() {
  console.log("Matching worker started");
  await redis.ping(); // verify connection before starting
  setInterval(() => {
    pollAllQueues();
  }, 2000);
}

main();