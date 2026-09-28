/**
 * World Elevation and Road Geography for Northbridge
 * Computes the exact ground and road deck elevation at any (x, z) coordinate.
 */

export interface RoadWaypoint {
  x: number;
  z: number;
  y: number;
  width: number;
  lanes: number;
  isBridge?: boolean;
  isMountain?: boolean;
}

export interface DetailedRoadSegment {
  id: string;
  p1: [number, number, number]; // [x, y, z]
  p2: [number, number, number];
  width: number;
  lanes: number;
  isBridge?: boolean;
  isMountain?: boolean;
  name?: string;
}

/**
 * Heightmap function for Northbridge
 * Gives natural elevation across the whole region:
 * - Central Square: ~0.5m (flat town plateau)
 * - Lake Northbridge: -2.5m (water at -1.2m)
 * - Old Town: 1.0m to 6.0m (historic rising hill)
 * - Industrial Yard: 0.5m (flat concrete port area)
 * - Pine Ridge: 2.0m up to 32.0m (alpine mountain ridge with scenic switchbacks)
 */
export function getTerrainHeight(x: number, z: number): number {
  let h = 0.5;

  // 1. Lake Northbridge Basin (Center ~ 220, 190)
  const lakeDist = Math.hypot(x - 220, (z - 190) * 1.2);
  if (lakeDist < 120) {
    const lakeDepth = (1 - lakeDist / 120) * 4.5;
    h -= lakeDepth;
  }

  // 2. Pine Ridge Mountain Peak & Slopes (Center ~ -240, -220)
  const pineDist = Math.hypot(x - (-240), z - (-220));
  if (pineDist < 250) {
    const mountainFactor = 1 - pineDist / 250;
    // Layered mountain ridge with plateau and peaks
    h += Math.pow(mountainFactor, 1.3) * 32.0;

    // Small craggy ridge variation
    h += Math.sin(x * 0.04) * Math.cos(z * 0.04) * 2.0 * mountainFactor;
  }

  // 3. Old Town Hillside (Center ~ -200, 160)
  const oldTownDist = Math.hypot(x - (-200), z - 160);
  if (oldTownDist < 160) {
    const hillFactor = 1 - oldTownDist / 160;
    h += hillFactor * 6.5;
  }

  // 4. Industrial Yard Riverbank / Coastline
  if (x > 260) {
    h += Math.sin(z * 0.03) * 1.0;
  }

  return h;
}

/**
 * Bridge road deck elevation
 * Parabolic arch rising above the lake water from x=160, z=120 to x=240, z=160
 */
export function getBridgeElevation(x: number, z: number): number | null {
  // Bridge spans from [160, 120] to [240, 160]
  const p1x = 160, p1z = 120;
  const p2x = 240, p2z = 160;
  const dx = p2x - p1x;
  const dz = p2z - p1z;
  const lenSq = dx * dx + dz * dz;

  // Project point onto line segment
  const t = ((x - p1x) * dx + (z - p1z) * dz) / lenSq;

  if (t >= -0.05 && t <= 1.05) {
    const perpDist = Math.abs((z - p1z) * dx - (x - p1x) * dz) / Math.sqrt(lenSq);
    if (perpDist <= 9.0) {
      // Parabolic vertical curve: rises up to 9.5m in center
      const arch = Math.sin(Math.max(0, Math.min(1, t)) * Math.PI) * 7.5;
      return 2.0 + arch;
    }
  }

  return null;
}

/**
 * Authoritative elevation for vehicles and props:
 * If on the bridge, returns bridge deck elevation; otherwise returns terrain height.
 */
export function getWorldElevation(x: number, z: number): number {
  const bridgeH = getBridgeElevation(x, z);
  if (bridgeH !== null) {
    return bridgeH;
  }
  return getTerrainHeight(x, z);
}
