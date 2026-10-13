// All settings come from environment variables, with defaults that work
// when no .env file exists. Every other file reads its settings from here.

function textFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  return raw.trim().replace(/\/+$/, ''); // no trailing slash, so we can add "/search"
}

function numberFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export const config = {
  port: numberFromEnv('PORT', 4000),
  geocodingUrl: textFromEnv('GEOCODING_URL', 'https://geocoding-api.open-meteo.com/v1'),
  forecastUrl: textFromEnv('FORECAST_URL', 'https://api.open-meteo.com/v1'),
  upstreamTimeoutMs: numberFromEnv('UPSTREAM_TIMEOUT_MS', 5000),
  cacheTtlSeconds: numberFromEnv('CACHE_TTL_SECONDS', 600),
};
