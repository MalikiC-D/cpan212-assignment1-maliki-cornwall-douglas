// Checks query-string values. Each function returns clean values or throws a 400.
import { HttpError } from './http-error.js';

const MIN_NAME = 2;
const MAX_NAME = 60;
const MIN_CITIES = 2;
const MAX_CITIES = 5;

function invalid(field, message) {
  return new HttpError(400, 'Invalid query', { [field]: message });
}

// Express gives a string, or an array when the parameter was sent more than once.
function singleString(field, value) {
  if (value === undefined) throw invalid(field, `${field} is required`);
  if (Array.isArray(value)) throw invalid(field, `${field} must be sent only once`);
  if (typeof value !== 'string') throw invalid(field, `${field} must be text`);
  return value;
}

export function validateCity(value) {
  const city = singleString('city', value).trim();
  if (city === '') throw invalid('city', 'city must not be empty');
  if (city.length < MIN_NAME || city.length > MAX_NAME) {
    throw invalid('city', `city must be ${MIN_NAME} to ${MAX_NAME} characters`);
  }
  return city;
}

export function validateCities(value) {
  const text = singleString('cities', value);
  if (text.trim() === '') throw invalid('cities', 'cities must not be empty');

  const names = text.split(',').map((name) => name.trim());
  if (names.some((name) => name === '')) {
    throw invalid('cities', 'cities must not contain an empty name');
  }
  if (names.length < MIN_CITIES || names.length > MAX_CITIES) {
    throw invalid('cities', `cities must list ${MIN_CITIES} to ${MAX_CITIES} cities`);
  }
  if (names.some((name) => name.length < MIN_NAME || name.length > MAX_NAME)) {
    throw invalid('cities', `each city name must be ${MIN_NAME} to ${MAX_NAME} characters`);
  }

  const seen = new Set();
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) throw invalid('cities', `"${name}" is listed more than once`);
    seen.add(key);
  }
  return names;
}
