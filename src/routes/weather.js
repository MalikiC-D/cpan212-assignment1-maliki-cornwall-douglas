import { Router } from 'express';
import { ATTRIBUTION } from '../lib/attribution.js';
import { validateCity } from '../lib/validators.js';
import { getWeather } from '../lib/weather.js';

const router = Router();

// GET /api/weather?city=Toronto
router.get('/', async (req, res) => {
  const city = validateCity(req.query.city);
  const data = await getWeather(city);
  res.json({ data, attribution: ATTRIBUTION });
});

export default router;
