import { kv } from '@vercel/kv';
import { Redis } from '@upstash/redis';

export default async function handler(request, response) {
  const { scrapeId } = request.query;

  if (!scrapeId) {
    return response.status(400).json({ message: 'scrapeId is required' });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  try {
    const result = await kv.get(`scrape:${scrapeId}`);
    const result = await redis.get(`scrape:${scrapeId}`);
    if (result) {
      // Once read, we can delete it to clean up the store
      await kv.del(`scrape:${scrapeId}`);
      await redis.del(`scrape:${scrapeId}`);
      return response.status(200).json({ status: 'complete', data: result });
    } else {
      return response.status(200).json({ status: 'pending' });
    }
  } catch (error) {
    console.error('Error fetching result from KV store:', error);
    return response.status(500).json({ message: 'Failed to fetch scrape result.' });
    return response.status(500).json({ message: 'Failed to fetch scrape result from Upstash Redis.' });
  }
}