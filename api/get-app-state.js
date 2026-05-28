import { Redis } from '@upstash/redis';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
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