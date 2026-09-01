// Vercel Serverless Function: /api/reviews
// Obtiene resenas reales de Google Places, filtra 4-5 estrellas, cachea 6h.
export default async function handler(req, res) {
  const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  const PLACE_ID = 'ChIJieEWLrr_0YURXs1BpLWBJhc'; // INSTINTO, Roma Norte

  if (!API_KEY) {
    return res.status(500).json({ error: 'Falta GOOGLE_PLACES_API_KEY en variables de entorno de Vercel' });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=name,rating,user_ratings_total,reviews&language=es&key=${API_KEY}`;
    const r = await fetch(url);
    const data = await r.json();

    if (data.status !== 'OK') {
      return res.status(502).json({ error: 'Google Places respondio: ' + data.status });
    }

    const result = data.result;
    const allReviews = result.reviews || [];

    // Solo 4 y 5 estrellas, ordenadas por mas recientes
    const filtered = allReviews
      .filter(rv => rv.rating >= 4)
      .sort((a, b) => b.time - a.time)
      .slice(0, 8)
      .map(rv => ({
        author: rv.author_name,
        rating: rv.rating,
        text: rv.text,
        relativeTime: rv.relative_time_description,
        profilePhoto: rv.profile_photo_url || null
      }));

    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate'); // 6h cache
    return res.status(200).json({
      overallRating: result.rating,
      totalRatings: result.user_ratings_total,
      reviews: filtered
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno: ' + err.message });
  }
}
