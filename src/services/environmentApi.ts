/**
 * Free Public Environment Awareness Service (Open-Meteo)
 * Read-only air quality data. No API key required.
 *
 * Coordinates must come from the user's device with permission. There is no
 * fallback city: a fabricated local reading could discourage someone from
 * checking their actual conditions. Returns null when live data is unavailable.
 */
export interface EnvironmentData {
  aqi: number; // European AQI index
  aqiCategory: 'Good' | 'Moderate' | 'Sensitive' | 'Unhealthy';
  summary: string;
  isStale: boolean;
}

export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export async function fetchEnvironmentData(
  latitude: number,
  longitude: number
): Promise<EnvironmentData | null> {
  if (!isValidCoordinate(latitude, longitude)) return null;

  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=european_aqi`;
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return null;

    const data = await response.json();
    const rawAqi = data?.current?.european_aqi;
    const aqi = typeof rawAqi === 'number' && Number.isFinite(rawAqi) ? rawAqi : null;
    if (aqi === null) return null;

    let aqiCategory: EnvironmentData['aqiCategory'] = 'Good';
    if (aqi > 75) aqiCategory = 'Unhealthy';
    else if (aqi > 50) aqiCategory = 'Sensitive';
    else if (aqi > 25) aqiCategory = 'Moderate';

    return {
      aqi,
      aqiCategory,
      summary: `European AQI ${aqi} (${aqiCategory})`,
      isStale: false,
    };
  } catch {
    return null;
  }
}
