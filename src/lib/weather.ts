import type { LucideIcon } from "lucide-react";
import {
  Sun, CloudSun, CloudFog, CloudDrizzle, CloudRain,
  Snowflake, CloudLightning, Thermometer,
} from "lucide-react";

export interface WeatherDay {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;
  precipitationSum: number;
}

interface GeoCoords {
  lat: number;
  lon: number;
}

// In-memory caches
const geocodeCache = new Map<string, GeoCoords | null>();
const weatherCache = new Map<string, { data: WeatherDay[]; fetchedAt: number }>();
const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// WMO weather code to icon mapping
export function getWeatherIcon(code: number): LucideIcon {
  if (code === 0) return Sun;
  if (code <= 3) return CloudSun;
  if (code <= 48) return CloudFog;
  if (code <= 55) return CloudDrizzle;
  if (code <= 65) return CloudRain;
  if (code <= 75) return Snowflake;
  if (code <= 82) return CloudRain;
  if (code <= 99) return CloudLightning;
  return Thermometer;
}

export function getWeatherCondition(code: number): string {
  if (code === 0) return "clear";
  if (code <= 3) return "partlyCloudy";
  if (code <= 48) return "fog";
  if (code <= 55) return "drizzle";
  if (code <= 65) return "rain";
  if (code <= 75) return "snow";
  if (code <= 82) return "rain";
  if (code <= 99) return "thunderstorm";
  return "clear";
}

async function geocodeLocation(location: string): Promise<GeoCoords | null> {
  const cached = geocodeCache.get(location);
  if (cached !== undefined) return cached;

  try {
    const apiKey = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;
    if (!apiKey) return null;

    const res = await fetch(
      `https://us1.locationiq.com/v1/search?key=${apiKey}&q=${encodeURIComponent(location)}&format=json&limit=1`
    );

    if (!res.ok) {
      geocodeCache.set(location, null);
      return null;
    }

    const data = await res.json();
    if (!data || data.length === 0) {
      geocodeCache.set(location, null);
      return null;
    }

    const coords: GeoCoords = {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
    };
    geocodeCache.set(location, coords);
    return coords;
  } catch {
    geocodeCache.set(location, null);
    return null;
  }
}

async function fetchWeatherFromApi(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string
): Promise<WeatherDay[]> {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)},${startDate},${endDate}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < WEATHER_CACHE_TTL) {
    return cached.data;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Calculate max forecast date (16 days from now)
  const maxForecast = new Date(today);
  maxForecast.setDate(maxForecast.getDate() + 15);

  // Archive API typically lags 2–5 days; use a 5-day buffer so the forecast
  // API covers that window and there are no missing days in the middle of trips.
  const archiveCutoff = new Date(today);
  archiveCutoff.setDate(archiveCutoff.getDate() - 5);

  const results: WeatherDay[] = [];
  const params = `latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto`;

  // Fetch historical data for dates older than the archive cutoff
  if (start < archiveCutoff) {
    const histEnd = end < archiveCutoff
      ? endDate
      : new Date(archiveCutoff.getTime() - 86400000).toISOString().split("T")[0];
    try {
      const res = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?${params}&start_date=${startDate}&end_date=${histEnd}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.daily) {
          for (let i = 0; i < data.daily.time.length; i++) {
            results.push({
              date: data.daily.time[i],
              temperatureMax: data.daily.temperature_2m_max[i],
              temperatureMin: data.daily.temperature_2m_min[i],
              weatherCode: data.daily.weathercode[i],
              precipitationSum: data.daily.precipitation_sum[i] || 0,
            });
          }
        }
      }
    } catch {
      // Silently skip historical data on error
    }
  }

  // Fetch forecast data for recent days (bridging archive lag) and future dates
  if (end >= archiveCutoff) {
    const forecastStart = start >= archiveCutoff ? startDate : archiveCutoff.toISOString().split("T")[0];
    const forecastEnd = end <= maxForecast ? endDate : maxForecast.toISOString().split("T")[0];

    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params}&start_date=${forecastStart}&end_date=${forecastEnd}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.daily) {
          for (let i = 0; i < data.daily.time.length; i++) {
            results.push({
              date: data.daily.time[i],
              temperatureMax: data.daily.temperature_2m_max[i],
              temperatureMin: data.daily.temperature_2m_min[i],
              weatherCode: data.daily.weathercode[i],
              precipitationSum: data.daily.precipitation_sum[i] || 0,
            });
          }
        }
      }
    } catch {
      // Silently skip forecast data on error
    }
  }

  weatherCache.set(cacheKey, { data: results, fetchedAt: Date.now() });
  return results;
}

interface ItineraryItemForWeather {
  startTime: Date | string;
  location: string | null;
}

export async function getWeatherForTrip(
  destination: string | null,
  itineraryItems: ItineraryItemForWeather[],
  startDate: string,
  endDate: string
): Promise<Record<string, WeatherDay>> {
  // Build date → location map
  const dateLocationMap = new Map<string, string>();

  // Start with trip destination as default for all dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (destination) {
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dateLocationMap.set(d.toISOString().split("T")[0], destination);
    }
  }

  // Override with itinerary item locations where available;
  // for items without a location that aren't already covered by the destination range, use destination
  for (const item of itineraryItems) {
    const dateKey = new Date(item.startTime).toISOString().split("T")[0];
    if (item.location) {
      dateLocationMap.set(dateKey, item.location);
    } else if (destination && !dateLocationMap.has(dateKey)) {
      dateLocationMap.set(dateKey, destination);
    }
  }

  if (dateLocationMap.size === 0) return {};

  // Group dates by location
  const locationDates = new Map<string, string[]>();
  for (const [dateKey, loc] of dateLocationMap) {
    const dates = locationDates.get(loc) || [];
    dates.push(dateKey);
    locationDates.set(loc, dates);
  }

  // Limit unique locations to 10, fall back to destination if too many
  const uniqueLocations = Array.from(locationDates.keys());
  if (uniqueLocations.length > 10 && destination) {
    locationDates.clear();
    const allDates: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      allDates.push(d.toISOString().split("T")[0]);
    }
    locationDates.set(destination, allDates);
  }

  // Geocode and fetch weather for each unique location
  const result: Record<string, WeatherDay> = {};

  const entries = Array.from(locationDates.entries());
  const weatherPromises = entries.map(async ([location, dates]) => {
    const coords = await geocodeLocation(location);
    if (!coords) return;

    dates.sort();
    const locStartDate = dates[0];
    const locEndDate = dates[dates.length - 1];

    const weatherDays = await fetchWeatherFromApi(coords.lat, coords.lon, locStartDate, locEndDate);

    // Map weather days back to our date keys
    const weatherByDate = new Map<string, WeatherDay>();
    for (const day of weatherDays) {
      weatherByDate.set(day.date, day);
    }

    for (const dateKey of dates) {
      const w = weatherByDate.get(dateKey);
      if (w) result[dateKey] = w;
    }
  });

  await Promise.allSettled(weatherPromises);
  return result;
}
