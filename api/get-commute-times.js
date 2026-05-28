export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const { address } = request.body;
  const apiKey = process.env.MAPS_API_KEY;

  if (!address) {
    return response.status(400).json({ message: 'Address is required.' });
  }
  if (!apiKey) {
    return response.status(500).json({ message: 'Server configuration error: MAPS_API_KEY is not set.' });
  }

  const baseUrl = "https://maps.googleapis.com/maps/api/directions/json";
  const origin = `${address}, Santa Barbara, CA`;
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
        const params = new URLSearchParams({ origin, destination, mode, key: apiKey });
        const res = await fetch(`${baseUrl}?${params}`);
        const data = await res.json();

        if (data.status === "OK") {
            const duration = data.routes[0]?.legs[0]?.duration?.text;
            if (duration) {
              commuteTimes[key] = duration.replace("mins", "min");
            }
        } else {
            console.warn(`Maps API Warning for '${address}' to '${destination}': ${data.status}`);
        }
        // Small delay to be a good API citizen
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    return response.status(200).json(commuteTimes);
  } catch (error) {
    console.error(`Error fetching directions for '${address}':`, error);
    return response.status(500).json({ message: 'Failed to fetch commute times.' });
  }
}