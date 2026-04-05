import Redis from 'ioredis';
import { handleMatchEvent } from '../controllers/matchingController';
import { MATCH_EVENTS_GROUP, MATCH_EVENTS_STREAM_KEY } from './redisKeys';

type StreamEntry = [string, string[]];
type StreamReadResult = [string, StreamEntry[]][];

function getPayloadFromFields(fields: string[]): string | null {
  for (let i = 0; i < fields.length; i += 2) {
    if (fields[i] === 'payload') {
      return fields[i + 1] ?? null;
    }
  }

  return null;
}

async function ensureConsumerGroup(consumer: Redis): Promise<void> {
  try {
    await consumer.call(
      'XGROUP',
      'CREATE',
      MATCH_EVENTS_STREAM_KEY,
      MATCH_EVENTS_GROUP,
      '$',
      'MKSTREAM',
    );
    console.log('[StreamConsumer] Created match events consumer group');
  } catch (error) {
    if (error instanceof Error && error.message.includes('BUSYGROUP')) {
      return;
    }

    throw error;
  }
}

async function consumeMatchEvents(
  consumer: Redis,
  consumerName: string,
): Promise<void> {
  while (true) {
    try {
      const messages = (await consumer.call(
        'XREADGROUP',
        'GROUP',
        MATCH_EVENTS_GROUP,
        consumerName,
        'BLOCK',
        '0',
        'COUNT',
        '10',
        'STREAMS',
        MATCH_EVENTS_STREAM_KEY,
        '>',
      )) as StreamReadResult | null;

      if (!messages) {
        continue;
      }

      for (const [, entries] of messages) {
        for (const [entryId, fields] of entries) {
          const payload = getPayloadFromFields(fields);
          if (!payload) {
            console.error(
              `[StreamConsumer] Missing payload field in stream entry ${entryId}`,
            );
            await consumer.xack(MATCH_EVENTS_STREAM_KEY, MATCH_EVENTS_GROUP, entryId);
            continue;
          }

          try {
            const handled = await handleMatchEvent(payload);
            if (!handled) {
              console.error(
                `[StreamConsumer] Deferred ACK for stream entry ${entryId} due to processing failure`,
              );
              continue;
            }

            await consumer.xack(MATCH_EVENTS_STREAM_KEY, MATCH_EVENTS_GROUP, entryId);
          } catch (error) {
            console.error(
              `[StreamConsumer] Failed to process stream entry ${entryId}:`,
              error,
            );
          }
        }
      }
    } catch (error) {
      console.error('[StreamConsumer] XREADGROUP failed:', error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

export function startMatchStreamConsumer() {
  const consumer = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  });
  const consumerName =
    process.env.MATCH_EVENTS_CONSUMER_NAME ?? `matching-service-${process.pid}`;

  ensureConsumerGroup(consumer)
    .then(() => {
      console.log('[StreamConsumer] Listening for match events from Redis stream');
      return consumeMatchEvents(consumer, consumerName);
    })
    .catch((error) => {
      console.error('[StreamConsumer] Failed to start:', error);
    });
}
