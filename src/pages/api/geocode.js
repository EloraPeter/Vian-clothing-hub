export default async function handler(req, res) {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
      {
        headers: {
          'User-Agent': 'VianClothingHub/1.0 (https://vianclothinghub.com)',
        },
      }
    );
    if (!response.ok) {
      throw new Error('Nominatim API request failed');
    }
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Geocode error:', error);
    res.status(500).json({ error: 'Failed to fetch geocoding data' });
  }
}