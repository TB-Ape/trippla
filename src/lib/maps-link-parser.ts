export interface MapsParseResult {
  departureLocation: string | null;
  arrivalLocation: string | null;
  mode: string | null;
  title: string | null;
}

const GOOGLE_MODE_MAP: Record<string, string> = {
  driving: "car",
  transit: "train",
  walking: "walk",
  bicycling: "bike",
};

// Google Maps encodes travel mode as !3eN in the data parameter
const GOOGLE_DATA_MODE_MAP: Record<string, string> = {
  "0": "car",
  "1": "bike",
  "2": "walk",
  "3": "train",
};

function cleanLocationName(raw: string): string {
  return decodeURIComponent(raw)
    .replace(/\+/g, " ")
    .replace(/@.*$/, "") // strip coordinates suffix
    .trim();
}

export function isGoogleShortLink(input: string): boolean {
  try {
    const url = new URL(input.trim());
    return url.hostname.includes("goo.gl");
  } catch {
    return false;
  }
}

export function parseGoogleMapsLink(input: string): MapsParseResult | null {
  const trimmed = input.trim();

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // Must be a Google Maps domain
  if (
    !url.hostname.includes("google.com") &&
    !url.hostname.includes("google.de") &&
    !url.hostname.includes("goo.gl")
  ) {
    return null;
  }

  let departure: string | null = null;
  let arrival: string | null = null;
  let mode: string | null = null;

  // Try query params first (api=1 format)
  const origin = url.searchParams.get("origin");
  const destination = url.searchParams.get("destination");
  const travelmode = url.searchParams.get("travelmode");

  if (origin && destination) {
    departure = cleanLocationName(origin);
    arrival = cleanLocationName(destination);
  }

  if (travelmode && GOOGLE_MODE_MAP[travelmode]) {
    mode = GOOGLE_MODE_MAP[travelmode];
  }

  // Try !3eN encoding in the URL (path or hash)
  if (!mode) {
    const fullUrl = trimmed;
    const dataModeMatch = fullUrl.match(/!3e(\d)/);
    if (dataModeMatch && GOOGLE_DATA_MODE_MAP[dataModeMatch[1]]) {
      mode = GOOGLE_DATA_MODE_MAP[dataModeMatch[1]];
    }
  }

  // Try path-based format: /maps/dir/ORIGIN/DESTINATION/...
  if (!departure || !arrival) {
    const dirMatch = url.pathname.match(/\/maps\/dir\/([^/]+)\/([^/]+)/);
    if (dirMatch) {
      departure = cleanLocationName(dirMatch[1]);
      arrival = cleanLocationName(dirMatch[2]);
    }
  }

  if (!departure && !arrival) {
    return null;
  }

  const title =
    departure && arrival ? `${departure} → ${arrival}` : null;

  return { departureLocation: departure, arrivalLocation: arrival, mode, title };
}
