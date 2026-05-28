import { Redis } from '@upstash/redis';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const { apartments, archivedApartments } = request.body;

  if (!Array.isArray(apartments) || !Array.isArray(archivedApartments)) {
      return response.status(400).json({ message: 'Invalid data format. `apartments` and `archivedApartments` must be arrays.' });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  try {
    // Store the entire state object as a single JSON string under a consistent key.
    await redis.set('app-state', JSON.stringify({ apartments, archivedApartments }));
    return response.status(200).json({ message: 'State saved successfully.' });
  } catch (error) {
    console.error('Error saving state to Upstash Redis:', error);
    return response.status(500).json({ message: 'Failed to save application state.' });
  }
}