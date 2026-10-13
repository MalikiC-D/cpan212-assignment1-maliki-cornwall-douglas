// One lookup used by both /api/weather and /api/compare.
import { weatherCache } from './cache.js';
import { HttpError } from './http-error.js';
import { fetchForecast, findLocation } from './open-meteo.js';
import { describeWeatherCode } from './weather-codes.js';

export async function getWeather(city) {
  const name = city.trim();
  const cacheKey = name.toLowerCase();

  const cached = weatherCache.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  const location = await findLocation(name);
  if (!location) throw new HttpError(404, `City not found: ${name}`);

  const forecast = await fetchForecast(location.latitude, location.longitude);

  const summary = {
    location,
    current: {
      ...forecast.current,
      conditions: describeWeatherCode(forecast.current.weatherCode),
    },
    daily: forecast.daily.map((day) => ({
      ...day,
      conditions: describeWeatherCode(day.weatherCode),
    })),
    fetchedAt: new Date().toISOString(),
    cached: false,
  };

  weatherCache.set(cacheKey, summary); // only successful lookups get here
  return summary;
}
