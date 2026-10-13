// Looks up several cities at the same time and builds the compare response data.
import { HttpError } from './http-error.js';
import { getWeather } from './weather.js';

const PLANNED_STATUSES = [404, 502, 504];

// Same status the /api/weather endpoint would have used for this failure.
function toErrorInfo(reason) {
  if (reason instanceof HttpError && PLANNED_STATUSES.includes(reason.status)) {
    return { status: reason.status, message: reason.message };
  }
  console.error(reason);
  return { status: 500, message: 'Internal server error' };
}

export async function compareCities(names) {
  // map() starts every lookup right away; allSettled waits for all of them
  // and never rejects, so one failure can't hide the other cities.
  const settled = await Promise.allSettled(names.map((name) => getWeather(name)));

  const cities = settled.map((result, i) =>
    result.status === 'fulfilled'
      ? { city: names[i], ok: true, weather: result.value }
      : { city: names[i], ok: false, error: toErrorInfo(result.reason) },
  );

  let warmest = null;
  let coldest = null;
  for (const entry of cities) {
    if (!entry.ok) continue;
    const temp = entry.weather.current.temperatureC;
    // strict < and > so that on a tie the city listed first wins
    if (warmest === null || temp > warmest.temp) warmest = { temp, name: entry.weather.location.name };
    if (coldest === null || temp < coldest.temp) coldest = { temp, name: entry.weather.location.name };
  }

  const succeeded = cities.filter((entry) => entry.ok).length;
  return {
    cities,
    summary: {
      succeeded,
      failed: cities.length - succeeded,
      warmest: warmest?.name ?? null,
      coldest: coldest?.name ?? null,
    },
  };
}
