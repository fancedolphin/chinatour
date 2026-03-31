import type { PlaceCandidate } from './contracts';

export function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s·•\-\(\)（）]/g, '')
    .replace(/(景区|景点|博物馆|分店|店|餐厅|饭店|酒家)$/g, '');
}

export function isSimilarName(left: string, right: string): boolean {
  const normalizedLeft = normalizeEntityName(left);
  const normalizedRight = normalizeEntityName(right);
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

export function haversineDistanceMeters(
  left: { lat: number; lng: number },
  right: { lat: number; lng: number },
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad(right.lat - left.lat);
  const dLng = toRad(right.lng - left.lng);
  const p =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(left.lat)) *
      Math.cos(toRad(right.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return earthRadius * 2 * Math.atan2(Math.sqrt(p), Math.sqrt(1 - p)) * 1000;
}

export function isDuplicate(left: PlaceCandidate, right: PlaceCandidate): boolean {
  if (isSimilarName(left.name, right.name)) {
    return true;
  }

  if (left.location && right.location) {
    return haversineDistanceMeters(left.location, right.location) < 200;
  }

  return false;
}
