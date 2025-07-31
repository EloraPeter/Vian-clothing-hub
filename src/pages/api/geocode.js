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
          'User-Agent': 'Mozilla/5.0 (compatible; VianClothingBot/1.0; +https://vianclothinghub.com)',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nominatim API error:', response.status, errorText);
      throw new Error('Nominatim API request failed');
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Geocode error:', error.message);
    res.status(500).json({ error: 'Failed to fetch geocoding data' });
  }
}
