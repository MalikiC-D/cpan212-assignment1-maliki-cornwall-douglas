import { Router } from 'express';
import { ATTRIBUTION } from '../lib/attribution.js';
import { compareCities } from '../lib/compare.js';
import { validateCities } from '../lib/validators.js';

const router = Router();

// GET /api/compare?cities=Toronto,Vancouver,Halifax
router.get('/', async (req, res) => {
  const names = validateCities(req.query.cities);
  const data = await compareCities(names);
  res.json({ data, attribution: ATTRIBUTION });
});

export default router;
