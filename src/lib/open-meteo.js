// The only file that calls fetch or knows Open-Meteo's URLs and parameter names.
// It returns plain objects shaped the way the rest of the app wants them.
import { config } from '../config.js';
import { HttpError } from './http-error.js';

const FORECAST_FAILED = 'Could not get a valid response from the forecast service';
const GEOCODING_FAILED = 'Could not get a valid response from the geocoding service';

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Calls Open-Meteo and returns the parsed JSON, or throws an HttpError:
//   504 = no answer within UPSTREAM_TIMEOUT_MS
//   502 = no response, a non-2xx response, or a body that isn't valid JSON
async function getJson(serviceName, failedMessage, url) {
  const timeoutMessage = `The ${serviceName} service did not respond within ${config.upstreamTimeoutMs} ms`;

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(config.upstreamTimeoutMs) });
  } catch (err) {
    if (err?.name === 'TimeoutError') throw new HttpError(504, timeoutMessage);
    throw new HttpError(502, failedMessage); // e.g. unknown host, refused connection
  }

  if (!res.ok) {
    res.body?.cancel().catch(() => {}); // we don't need the body
    throw new HttpError(502, failedMessage);
  }

  try {
    return await res.json();
  } catch (err) {
    // The timeout can also fire while the body is still arriving.
    if (err?.name === 'TimeoutError') throw new HttpError(504, timeoutMessage);
    throw new HttpError(502, failedMessage); // not valid JSON
  }
}

// Turns a city name into { name, region, country, latitude, longitude, timezone },
// or null when Open-Meteo has no match.
export async function findLocation(city) {
  const params = new URLSearchParams({
    name: city,
    count: '1',
    language: 'en',
    format: 'json',
  });
  const body = await getJson('geocoding', GEOCODING_FAILED, `${config.geocodingUrl}/search?${params}`);

  if (!isObject(body)) throw new HttpError(502, GEOCODING_FAILED);
  if (body.results === undefined) return null; // nothing matched
  if (!Array.isArray(body.results)) throw new HttpError(502, GEOCODING_FAILED);
  if (body.results.length === 0) return null;

  const match = body.results[0];
  if (
    !isObject(match) ||
    typeof match.name !== 'string' ||
    typeof match.latitude !== 'number' ||
    typeof match.longitude !== 'number'
  ) {
    throw new HttpError(502, GEOCODING_FAILED);
  }

  return {
    name: match.name,
    region: match.admin1 ?? null,
    country: match.country ?? null,
    latitude: match.latitude,
    longitude: match.longitude,
    timezone: match.timezone ?? null,
  };
}

// Gets the current weather and 3-day forecast for a pair of coordinates.
// Values are copied exactly as Open-Meteo sends them (no rounding, no unit changes).
export async function fetchForecast(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '3',
  });
  const body = await getJson('forecast', FORECAST_FAILED, `${config.forecastUrl}/forecast?${params}`);

  const { current, daily } = isObject(body) ? body : {};
  const dailyArrays = isObject(daily)
    ? [
        daily.time,
        daily.weather_code,
        daily.temperature_2m_max,
        daily.temperature_2m_min,
        daily.precipitation_probability_max,
      ]
    : [];
  if (!isObject(current) || dailyArrays.length === 0 || !dailyArrays.every(Array.isArray)) {
    throw new HttpError(502, FORECAST_FAILED);
  }

  return {
    current: {
      time: current.time,
      temperatureC: current.temperature_2m,
      feelsLikeC: current.apparent_temperature,
      humidityPercent: current.relative_humidity_2m,
      windKmh: current.wind_speed_10m,
      weatherCode: current.weather_code,
    },
    daily: daily.time.map((date, i) => ({
      date,
      minC: daily.temperature_2m_min[i],
      maxC: daily.temperature_2m_max[i],
      precipitationChancePercent: daily.precipitation_probability_max[i] ?? null,
      weatherCode: daily.weather_code[i],
    })),
  };
}
