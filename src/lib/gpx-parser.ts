// GPX file parser — extracts distance, elevation, and duration from GPS tracks

interface GpxPoint {
  lat: number;
  lon: number;
  ele: number | null;
  time: Date | null;
}

interface GpxResult {
  name: string | null;
  distance: number; // km
  elevationGain: number; // meters
  elevationLoss: number; // meters
  duration: number | null; // hours
  startLocation: string | null;
  endLocation: string | null;
}

// Haversine formula — distance between two GPS points in meters
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function parseGpx(gpxContent: string): GpxResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxContent, "text/xml");

  // Get track name
  const nameEl = doc.querySelector("trk > name") || doc.querySelector("metadata > name");
  const name = nameEl?.textContent || null;

  // Collect all track points
  const points: GpxPoint[] = [];
  const trkpts = doc.querySelectorAll("trkpt");

  trkpts.forEach((pt) => {
    const lat = parseFloat(pt.getAttribute("lat") || "0");
    const lon = parseFloat(pt.getAttribute("lon") || "0");
    const eleEl = pt.querySelector("ele");
    const timeEl = pt.querySelector("time");

    points.push({
      lat,
      lon,
      ele: eleEl ? parseFloat(eleEl.textContent || "0") : null,
      time: timeEl ? new Date(timeEl.textContent || "") : null,
    });
  });

  // Also check route points (rte/rtept) if no track points
  if (points.length === 0) {
    const rtepts = doc.querySelectorAll("rtept");
    rtepts.forEach((pt) => {
      const lat = parseFloat(pt.getAttribute("lat") || "0");
      const lon = parseFloat(pt.getAttribute("lon") || "0");
      const eleEl = pt.querySelector("ele");

      points.push({
        lat,
        lon,
        ele: eleEl ? parseFloat(eleEl.textContent || "0") : null,
        time: null,
      });
    });
  }

  if (points.length < 2) {
    return {
      name,
      distance: 0,
      elevationGain: 0,
      elevationLoss: 0,
      duration: null,
      startLocation: null,
      endLocation: null,
    };
  }

  // Calculate distance
  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    totalDistance += haversine(
      points[i - 1].lat, points[i - 1].lon,
      points[i].lat, points[i].lon
    );
  }

  // Calculate elevation gain/loss with smoothing (ignore changes < 5m to filter GPS noise)
  let elevationGain = 0;
  let elevationLoss = 0;
  const THRESHOLD = 5; // meters — ignore small fluctuations

  const elevations = points
    .map((p) => p.ele)
    .filter((e): e is number => e !== null);

  if (elevations.length > 1) {
    let lastSignificant = elevations[0];
    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - lastSignificant;
      if (Math.abs(diff) >= THRESHOLD) {
        if (diff > 0) elevationGain += diff;
        else elevationLoss += Math.abs(diff);
        lastSignificant = elevations[i];
      }
    }
  }

  // Calculate duration from timestamps
  let duration: number | null = null;
  const firstTime = points[0].time;
  const lastTime = points[points.length - 1].time;
  if (firstTime && lastTime) {
    const diffMs = lastTime.getTime() - firstTime.getTime();
    duration = Math.round((diffMs / 3600000) * 10) / 10; // hours, 1 decimal
  }

  // Format coordinates as location strings
  const startLocation = `${points[0].lat.toFixed(4)}, ${points[0].lon.toFixed(4)}`;
  const endLocation = `${points[points.length - 1].lat.toFixed(4)}, ${points[points.length - 1].lon.toFixed(4)}`;

  return {
    name,
    distance: Math.round((totalDistance / 1000) * 10) / 10, // km, 1 decimal
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
    duration,
    startLocation,
    endLocation,
  };
}
