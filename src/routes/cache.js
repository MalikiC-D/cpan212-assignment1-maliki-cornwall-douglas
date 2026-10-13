import { Router } from 'express';
import { weatherCache } from '../lib/cache.js';

const router = Router();

// GET /api/cache/stats
router.get('/stats', (req, res) => {
  res.json({ data: weatherCache.stats() });
});

export default router;
