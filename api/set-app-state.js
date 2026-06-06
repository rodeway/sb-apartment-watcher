import { Redis } from '@upstash/redis';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const { apartments, archivedApartments } = request.body;

  if (!Array.isArray(apartments) || !Array.isArray(archivedApartments)) {
      return response.status(400).json({ message: 'Invalid data format. `apartments` and `archivedApartments` must be arrays.' });
  }

  const stateToSave = { apartments, archivedApartments };
  const payload = JSON.stringify(stateToSave);
  const payloadSize = Buffer.byteLength(payload, 'utf8');

  // Upstash free tier has a 1MB limit per request. We add a check to prevent
  // oversized payloads from causing cryptic errors from the Redis client.
  if (payloadSize > 1000000) { // 1MB
    const errorMessage = `State size (${payloadSize} bytes) exceeds 1MB limit. Cannot save to Redis.`;
    console.error(errorMessage);
    // Return 413 Payload Too Large
    return response.status(413).json({ message: errorMessage });
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
    // Store the entire state object as a single JSON string under a consistent key.
    await redis.set('app-state', payload);
    return response.status(200).json({ message: 'State saved successfully.' });
  } catch (error) {
    console.error('Error saving state to Upstash Redis:', error);
    return response.status(500).json({ message: 'Failed to save application state.' });
  }
}