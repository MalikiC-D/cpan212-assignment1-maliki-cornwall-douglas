# City Weather API

A small Express service for CPAN-212 Assignment 1. It turns a city name into current weather and a 3-day forecast using the free [Open-Meteo](https://open-meteo.com/) geocoding and forecast APIs. It can look up one city or compare several, and it keeps recent answers in a short-lived in-memory cache.

## How to run it

You need Node.js 24 or newer.

```bash
npm install
cp .env.example .env     # optional: every setting has a default
npm run dev              # restarts when the code changes
```

On Windows PowerShell use `copy .env.example .env` instead of `cp`. Use `npm start` to run without auto-restart. The server prints `City Weather API listening on http://localhost:4000` when it is ready.

If `npm run dev` does not restart after you edit `.env`, stop it with Ctrl+C and start it again.

## Settings

All settings are environment variables. If one is missing, empty, or not a positive whole number, the default is used.

| Variable | Default | What it does |
| --- | --- | --- |
| `PORT` | `4000` | Port the server listens on |
| `GEOCODING_URL` | `https://geocoding-api.open-meteo.com/v1` | Base URL of the Open-Meteo geocoding API |
| `FORECAST_URL` | `https://api.open-meteo.com/v1` | Base URL of the Open-Meteo forecast API |
| `UPSTREAM_TIMEOUT_MS` | `5000` | How long to wait for each Open-Meteo call before giving up (504) |
| `CACHE_TTL_SECONDS` | `600` | How long a successful lookup stays in the cache |

## Endpoints

### `GET /api/weather?city=Toronto`

Returns the weather for one city. `city` is required, sent once, and 2 to 60 characters after trimming.

```json
{
  "data": {
    "location": { "name": "Toronto", "region": "Ontario", "country": "Canada", "latitude": 43.70643, "longitude": -79.39864, "timezone": "America/Toronto" },
    "current": { "time": "2026-10-12T15:15", "temperatureC": 21.3, "feelsLikeC": 20.9, "humidityPercent": 54, "windKmh": 11.5, "weatherCode": 0, "conditions": "Clear sky" },
    "daily": [
      { "date": "2026-10-12", "minC": 11.9, "maxC": 22.4, "precipitationChancePercent": 0, "weatherCode": 0, "conditions": "Clear sky" }
    ],
    "fetchedAt": "2026-10-12T19:15:30.123Z",
    "cached": false
  },
  "attribution": "Weather data by Open-Meteo.com (https://open-meteo.com/)"
}
```

`daily` always has 3 entries (the example shows one to keep it short). `cached` is `true` when the answer came from the cache; `fetchedAt` then still shows when Open-Meteo was originally called.

### `GET /api/compare?cities=Toronto,Vancouver,Halifax`

Looks up 2 to 5 comma-separated cities at the same time. Names are trimmed, each must be 2 to 60 characters, and the same city can't be listed twice (ignoring upper/lower case). Each city uses the same lookup and cache as `/api/weather`.

One failed city does not fail the whole request. The response is `200` and every city has its own result, in the order they were listed:

```json
{
  "data": {
    "cities": [
      { "city": "Toronto", "ok": true, "weather": { "...": "same object as /api/weather data" } },
      { "city": "Qwertyville", "ok": false, "error": { "status": 404, "message": "City not found: Qwertyville" } }
    ],
    "summary": { "succeeded": 1, "failed": 1, "warmest": "Toronto", "coldest": "Toronto" }
  },
  "attribution": "Weather data by Open-Meteo.com (https://open-meteo.com/)"
}
```

`warmest` and `coldest` are based on the current temperature of the cities that worked, and are `null` if none did. On a tie, the city listed first wins.

### `GET /api/cache/stats`

```json
{ "data": { "entries": 3, "hits": 3, "misses": 5, "ttlSeconds": 600 } }
```

Every city lookup that passes validation counts as exactly one hit or one miss. Requests that fail validation are not counted.

## Errors

Every error looks like `{ "error": { "message": "...", "details": { ... } } }`. `details` only appears on `400`.

| Status | When |
| --- | --- |
| `400` | The query is invalid (`details` says which field and why) |
| `404` | The city was not found, or the route does not exist |
| `502` | Open-Meteo could not be reached, answered with an error, or sent something unusable |
| `504` | Open-Meteo did not answer within `UPSTREAM_TIMEOUT_MS` |
| `500` | Anything unexpected. The details are logged on the server only, never sent to the client |

## Project layout

```
src/
  server.js              starts the server
  app.js                 wires the middleware and routes together
  config.js              reads the environment variables
  routes/                weather.js, compare.js, cache.js: validate, call lib, send the response
  middleware/            request-logger.js, not-found.js, error-handler.js
  lib/
    open-meteo.js        the only file that calls fetch or knows Open-Meteo's URLs and parameters
    weather.js           one lookup: cache check, geocode, forecast, build the summary
    compare.js           runs several lookups at once and builds the summary
    cache.js             in-memory cache with expiry and hit/miss counters
    validators.js        checks query values
    weather-codes.js     weather code -> text
    http-error.js        an error that carries an HTTP status
    attribution.js       the attribution text
```

## Testing it by hand

Start a fresh server, then run these in order. The status code is what matters.

```bash
curl -i "http://localhost:4000/api/weather?city=Toronto"                       # 200, cached: false
curl -i "http://localhost:4000/api/weather?city=toronto"                       # 200, cached: true
curl -i "http://localhost:4000/api/weather"                                    # 400
curl -i "http://localhost:4000/api/weather?city=Qwertyville"                   # 404
curl -i "http://localhost:4000/api/compare?cities=Toronto,Vancouver,Halifax"   # 200
curl -i "http://localhost:4000/api/compare?cities=Toronto,Qwertyville"         # 200, one ok:false
curl -i "http://localhost:4000/api/compare?cities=a,b,c,d,e,f"                 # 400
curl -i "http://localhost:4000/api/compare?cities=Toronto,Halifax,toronto"     # 400
curl -i "http://localhost:4000/api/cache/stats"                                # 200: entries 3, hits 3, misses 5
curl -i "http://localhost:4000/nope"                                           # 404
```

To see a `504`, start the server with `UPSTREAM_TIMEOUT_MS=1` and ask for a city. To see a `502`, start it with `FORECAST_URL=https://weather.invalid/v1`.

## Credit

Weather and geocoding data from [Open-Meteo](https://open-meteo.com/) (CC BY 4.0).\
