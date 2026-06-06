import { Redis } from '@upstash/redis';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    const errorMessage = 'Server configuration error: Upstash Redis URL or Token is not set. Please check Vercel environment variables.';
    console.error(errorMessage);
    return response.status(500).json({ message: errorMessage });
  }

  const redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });

  try {
    const state = await redis.get('app-state');
    if (state) {
      return response.status(200).json(state);
    } else {
      // If no state is in Redis, return nulls. The client will handle initializing with default data.
      return response.status(200).json({ apartments: null, archivedApartments: null });
    }
  } catch (error) {
    console.error('Error fetching state from Upstash Redis:', error);
    return response.status(500).json({ message: 'Failed to fetch application state.' });
  }
}