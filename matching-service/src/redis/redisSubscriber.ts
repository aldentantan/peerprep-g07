import Redis from 'ioredis';
import { handleMatchEvent } from '../controllers/matchingController';
import { MATCH_EVENTS_GROUP_KEY, MATCH_EVENTS_STREAM_KEY } from './redisKeys';

const STREAM_BLOCK_MS = 5000;
const READ_COUNT = 10;
const RECLAIM_MIN_IDLE_MS = 5000;
const RECLAIM_COUNT = 20;
const RECLAIM_START_ID = '0-0';
const RECLAIM_EVERY_POLLS = 3;

type StreamEntry = [string, string[]];
type StreamReadResult = [string, StreamEntry[]][];
type StreamAutoClaimResult = [string, StreamEntry[], string[]?];

function getConsumerName(): string {
  const hostname = process.env.HOSTNAME ?? 'matching-service';
  return `${hostname}-${process.pid}`;
}

function getFieldValue(fields: string[], target: string): string | null {
  for (let index = 0; index < fields.length; index += 2) {
    if (fields[index] === target) {
      return fields[index + 1] ?? null;
    }
  }

  return null;
}

async function processStreamEntry(
  consumer: Redis,
  entryId: string,
  fields: string[],
) {
  const rawEvent = getFieldValue(fields, 'event');
  if (!rawEvent) {
    console.error(
      `[StreamConsumer] Missing 'event' field in stream entry ${entryId}; acking`,
    );
    await consumer.call(
      'XACK',
      MATCH_EVENTS_STREAM_KEY,
      MATCH_EVENTS_GROUP_KEY,
      entryId,
    );
    return;
  }

  try {
    await handleMatchEvent(rawEvent);
    await consumer.call(
      'XACK',
      MATCH_EVENTS_STREAM_KEY,
      MATCH_EVENTS_GROUP_KEY,
      entryId,
    );
  } catch (error) {
    console.error(
      `[StreamConsumer] Failed to process stream entry ${entryId}; leaving unacked for retry:`,
      error,
    );
  }
}

async function reclaimPendingEntries(
  consumer: Redis,
  consumerName: string,
  reclaimCursor: string,
): Promise<string> {
  const reclaimResult = (await consumer.call(
    'XAUTOCLAIM',
    MATCH_EVENTS_STREAM_KEY,
    MATCH_EVENTS_GROUP_KEY,
    consumerName,
    String(RECLAIM_MIN_IDLE_MS),
    reclaimCursor,
    'COUNT',
    String(RECLAIM_COUNT),
  )) as StreamAutoClaimResult;

  const [nextCursor, entries] = reclaimResult;

  if (entries.length > 0) {
    console.log(
      `[StreamConsumer] Reclaimed ${entries.length} stale stream entries from pending list`,
    );
    for (const [entryId, fields] of entries) {
      await processStreamEntry(consumer, entryId, fields);
    }
  }

  return nextCursor;
}

export async function ensureMatchEventConsumerGroup() {
  const client = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  });

  try {
    await client.call(
      'XGROUP',
      'CREATE',
      MATCH_EVENTS_STREAM_KEY,
      MATCH_EVENTS_GROUP_KEY,
      '$',
      'MKSTREAM',
    );
    console.log('[StreamConsumer] Created consumer group for match events');
  } catch (error) {
    if (error instanceof Error && error.message.includes('BUSYGROUP')) {
      console.log('[StreamConsumer] Consumer group already exists for match events');
      return;
    }

    throw error;
  } finally {
    client.disconnect();
  }
}

export function startMatchSubscriber() {
  const consumer = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  });

  const consumerName = getConsumerName();
  console.log(
    `[StreamConsumer] Starting stream consumer '${consumerName}' in group '${MATCH_EVENTS_GROUP_KEY}'`,
  );

  const poll = async () => {
    let reclaimCursor = RECLAIM_START_ID;
    let pollCount = 0;

    while (true) {
      try {
        pollCount += 1;

        if (pollCount % RECLAIM_EVERY_POLLS === 0) {
          reclaimCursor = await reclaimPendingEntries(
            consumer,
            consumerName,
            reclaimCursor,
          );
          if (reclaimCursor === RECLAIM_START_ID) {
            pollCount = 0;
          }
        }

        const result = (await consumer.call(
          'XREADGROUP',
          'GROUP',
          MATCH_EVENTS_GROUP_KEY,
          consumerName,
          'COUNT',
          String(READ_COUNT),
          'BLOCK',
          String(STREAM_BLOCK_MS),
          'STREAMS',
          MATCH_EVENTS_STREAM_KEY,
          '>',
        )) as StreamReadResult | null;

        if (!result) {
          continue;
        }

        for (const [, entries] of result) {
          for (const [entryId, fields] of entries) {
            await processStreamEntry(consumer, entryId, fields);
          }
        }
      } catch (error) {
        console.error('[StreamConsumer] Failed to read or reclaim from stream:', error);
      }
    }
  };

  poll().catch((error) => {
    console.error('[StreamConsumer] Fatal consumer loop error:', error);
  });
}
