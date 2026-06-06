export default async function handler(request, response) {
  const writeLog = (msg) => {
    // In a serverless environment like Vercel, writing to files is not reliable.
    // We use console.log, which will be captured by Vercel's logging service.
    console.log(`[COMMUTE_LOG] ${msg}`);
  };

  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const { address } = request.body;
  const apiKey = process.env.MAPS_API_KEY;

  writeLog(`=== Fetching for address: ${address} ===`);

  if (!address || typeof address !== 'string' || address.trim() === '') {
    writeLog(`Error: Address is required and must be a non-empty string. Received: ${address}`);
    return response.status(400).json({ message: 'Address is required and must be a non-empty string.' });
  }
  if (!apiKey) {
    writeLog(`Error: MAPS_API_KEY is not set in the environment variables.`);
    return response.status(500).json({ message: 'Server configuration error: MAPS_API_KEY is not set.' });
  }

  // Sanitize the address to remove unit numbers, which can confuse the Maps API.
  // This helps prevent "NOT_FOUND" or "ZERO_RESULTS" errors.
  const sanitizedAddress = address.split(',')[0].split('#')[0].trim();
  writeLog(`Sanitized address from "${address}" to "${sanitizedAddress}"`);

  const baseUrl = "https://maps.googleapis.com/maps/api/directions/json";
  const origin = `${sanitizedAddress}, Santa Barbara, CA`;
  const commuteTimes = {
      driveHospital: "", bikeEastBeach: "", bikeArroyoBurro: "", bikeAmtrak: ""
  };
  const destinations = {
      driveHospital: ["Santa Barbara Cottage Hospital", "driving"],
      bikeEastBeach: ["East Beach, Santa Barbara, CA", "bicycling"],
      bikeArroyoBurro: ["Arroyo Burro Beach County Park", "bicycling"],
      bikeAmtrak: ["Santa Barbara Amtrak Station", "bicycling"],
  };

  try {
    for (const [key, [destination, mode]] of Object.entries(destinations)) {
        writeLog(`Requesting ${mode} to ${destination}...`);
        const params = new URLSearchParams({ origin, destination, mode, key: apiKey });
        const res = await fetch(`${baseUrl}?${params}`);
        const data = await res.json();

        if (data.status === "OK") {
            const duration = data.routes[0]?.legs[0]?.duration?.text;
            if (duration) {
              commuteTimes[key] = duration.replace("mins", "min");
              writeLog(`Success: ${key} = ${commuteTimes[key]}`);
            } else {
              writeLog(`Warning: Status OK but no duration found for ${key}.`);
            }
        } else {
            writeLog(`Maps API Error for ${key}: ${data.status} - ${data.error_message || ''}`);
            console.warn(`Maps API Warning for '${address}' to '${destination}': ${data.status}`);
        }
        // Small delay to be a good API citizen
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    writeLog(`Completed fetching for ${address}. Result: ${JSON.stringify(commuteTimes)}`);
    return response.status(200).json(commuteTimes);
  } catch (error) {
    writeLog(`Exception during fetch: ${error.message}`);
    console.error(`Error fetching directions for '${address}':`, error);
    return response.status(500).json({ message: 'Failed to fetch commute times.' });
  }
}