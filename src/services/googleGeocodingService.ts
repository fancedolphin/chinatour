const BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

type GoogleGeocodingResponse = {
  status?: string;
  results?: Array<{
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  }>;
};

export type GeocodedCoordinates = {
  lat: number;
  lng: number;
};

export async function geocodeAddress(address: string): Promise<GeocodedCoordinates | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAP_API_KEY;
  const trimmedAddress = address.trim();

  if (!apiKey || !trimmedAddress) {
    return null;
  }

  const url = new URL(BASE_URL);
  url.searchParams.set('address', trimmedAddress);
  url.searchParams.set('key', apiKey);

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as GoogleGeocodingResponse;
    if (data.status !== 'OK' || !data.results?.length) {
      return null;
    }

    const location = data.results[0]?.geometry?.location;
    if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
      return null;
    }

    return {
      lat: location.lat,
      lng: location.lng,
    };
  } catch {
    return null;
  }
}

export default {
  geocodeAddress,
};
