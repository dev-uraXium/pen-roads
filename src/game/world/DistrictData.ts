import { BusStop, DistrictId, DistrictInfo } from '../../types/game';
import { getWorldElevation } from './WorldElevation';

export const DISTRICTS: Record<DistrictId, DistrictInfo> = {
  central_square: {
    id: 'central_square',
    name: 'Central Square',
    tagline: 'Municipal Heart & Clock Tower Plaza',
    center: [0, 0],
    radius: 120,
    color: '#3B82F6',
    landmark: 'Historic Stone Clock Tower',
    bestActivities: 'Taxi & Bus Passenger Routes',
  },
  old_town: {
    id: 'old_town',
    name: 'Old Town',
    tagline: 'Historic Cobblestone Alleys & Stone Arches',
    center: [-200, 160],
    radius: 110,
    color: '#F59E0B',
    landmark: 'Old City Gateway Arches',
    bestActivities: 'Bike Couriers & Van Deliveries',
  },
  industrial_yard: {
    id: 'industrial_yard',
    name: 'Industrial Yard',
    tagline: 'Freight Docks, Cranes & Warehouses',
    center: [220, -160],
    radius: 130,
    color: '#EF4444',
    landmark: 'Heavy Freight Crane & Container Yard',
    bestActivities: 'Truck & Heavy Cargo Contracts',
  },
  lakeside_highway: {
    id: 'lakeside_highway',
    name: 'Lakeside Highway',
    tagline: 'Scenic Shoreline & Suspension Bridge',
    center: [200, 180],
    radius: 140,
    color: '#06B6D4',
    landmark: 'Northbridge Suspension Bridge',
    bestActivities: 'Scenic Passenger Drives & Bridge Crossings',
  },
  pine_ridge: {
    id: 'pine_ridge',
    name: 'Pine Ridge',
    tagline: 'Alpine Mountain Slopes & Switchbacks',
    center: [-220, -190],
    radius: 140,
    color: '#10B981',
    landmark: 'Summit Radio Mast & Alpine Cabins',
    bestActivities: 'Mountain Pass Challenges & Rural Hauls',
  },
};

export const BUS_STOPS: BusStop[] = [
  {
    id: 'stop_central_depot',
    name: 'Central Terminal Depot',
    position: [15, getWorldElevation(15, 25), 25],
    direction: 0,
    district: 'central_square',
  },
  {
    id: 'stop_central_clock',
    name: 'Clock Tower Plaza',
    position: [-25, getWorldElevation(-25, -20), -20],
    direction: Math.PI / 2,
    district: 'central_square',
  },
  {
    id: 'stop_oldtown_market',
    name: 'Old Town Market Square',
    position: [-180, getWorldElevation(-180, 140), 140],
    direction: -Math.PI / 4,
    district: 'old_town',
  },
  {
    id: 'stop_lakeside_pier',
    name: 'Lakeside Marina Pier',
    position: [180, getWorldElevation(180, 160), 160],
    direction: Math.PI / 3,
    district: 'lakeside_highway',
  },
  {
    id: 'stop_pine_turnaround',
    name: 'Pine Ridge Alpine Lodge',
    position: [-200, getWorldElevation(-200, -180), -180],
    direction: Math.PI,
    district: 'pine_ridge',
  },
  {
    id: 'stop_industrial_gate',
    name: 'Freight Logistics Hub',
    position: [190, getWorldElevation(190, -140), -140],
    direction: -Math.PI / 2,
    district: 'industrial_yard',
  },
];

export interface RoadSegment {
  id?: string;
  p1: [number, number, number]; // [x, y, z]
  p2: [number, number, number];
  width: number;
  lanes: number;
  isBridge?: boolean;
  isMountain?: boolean;
  name?: string;
}

// 2D raw road definitions helper
interface RawRoad {
  p1: [number, number];
  p2: [number, number];
  width: number;
  lanes: number;
  isBridge?: boolean;
  isMountain?: boolean;
  name?: string;
}

const RAW_ROADS: RawRoad[] = [
  // 1. Central Ring & Main Downtown Boulevards
  { p1: [-80, -80], p2: [80, -80], width: 14, lanes: 2, name: 'North Boulevard' },
  { p1: [80, -80], p2: [80, 80], width: 14, lanes: 2, name: 'East Ring Road' },
  { p1: [80, 80], p2: [-80, 80], width: 14, lanes: 2, name: 'South Boulevard' },
  { p1: [-80, 80], p2: [-80, -80], width: 14, lanes: 2, name: 'West Ring Road' },
  { p1: [0, -100], p2: [0, 100], width: 16, lanes: 4, name: 'Central Avenue' },
  { p1: [-100, 0], p2: [100, 0], width: 16, lanes: 4, name: 'Civic Way' },

  // 2. Lakeside Highway & Northbridge Suspension Bridge
  { p1: [80, 50], p2: [160, 120], width: 14, lanes: 2, name: 'Lakeside Approach' },
  { p1: [160, 120], p2: [240, 160], width: 15, lanes: 2, isBridge: true, name: 'Northbridge Suspension Bridge' },
  { p1: [240, 160], p2: [260, 240], width: 14, lanes: 2, name: 'East Shore Highway' },
  { p1: [260, 240], p2: [180, 260], width: 12, lanes: 2, name: 'Lakehead Curve' },
  { p1: [180, 260], p2: [120, 200], width: 12, lanes: 2, name: 'Marina Parkway' },
  { p1: [120, 200], p2: [80, 80], width: 14, lanes: 2, name: 'South-East Connector' },

  // 3. Old Town (Cobblestone historic winding loop)
  { p1: [-80, 40], p2: [-140, 90], width: 12, lanes: 2, name: 'Historic Ascent' },
  { p1: [-140, 90], p2: [-200, 130], width: 11, lanes: 2, name: 'Cobblestone Gate Street' },
  { p1: [-200, 130], p2: [-240, 190], width: 10, lanes: 2, name: 'Old Town High Street' },
  { p1: [-240, 190], p2: [-170, 230], width: 10, lanes: 2, name: 'Castle Hill Crescent' },
  { p1: [-170, 230], p2: [-110, 160], width: 11, lanes: 2, name: 'Old Market Way' },
  { p1: [-110, 160], p2: [-80, 80], width: 14, lanes: 2, name: 'South Gate Boulevard' },

  // 4. Industrial Yard (Wide commercial freight roads)
  { p1: [80, -40], p2: [150, -100], width: 16, lanes: 4, name: 'Logistics Expressway' },
  { p1: [150, -100], p2: [220, -140], width: 16, lanes: 4, name: 'Freight Terminal Way' },
  { p1: [220, -140], p2: [270, -190], width: 14, lanes: 2, name: 'Container Dock Road' },
  { p1: [270, -190], p2: [200, -250], width: 14, lanes: 2, name: 'Warehouse Loop' },
  { p1: [200, -250], p2: [140, -180], width: 14, lanes: 2, name: 'Depot Spur' },
  { p1: [140, -180], p2: [80, -80], width: 16, lanes: 4, name: 'Port Connector' },

  // 5. Pine Ridge Mountain Pass (Climbing switchbacks)
  { p1: [-40, -80], p2: [-110, -140], width: 12, lanes: 2, isMountain: true, name: 'Pine Mountain Ascent' },
  { p1: [-110, -140], p2: [-170, -180], width: 12, lanes: 2, isMountain: true, name: 'Lower Ridge Pass' },
  { p1: [-170, -180], p2: [-230, -200], width: 11, lanes: 2, isMountain: true, name: 'Alpine Hairpin East' },
  { p1: [-230, -200], p2: [-260, -240], width: 10, lanes: 2, isMountain: true, name: 'Summit Crest Road' },
  { p1: [-260, -240], p2: [-220, -280], width: 10, lanes: 2, isMountain: true, name: 'Lodge View Pass' },
  { p1: [-220, -280], p2: [-150, -260], width: 11, lanes: 2, isMountain: true, name: 'Ridge Descent' },
  { p1: [-150, -260], p2: [-80, -160], width: 12, lanes: 2, isMountain: true, name: 'Timberline Way' },
  { p1: [-80, -160], p2: [-80, -80], width: 14, lanes: 2, name: 'Mountain Junction' },

  // 6. Connectors (Loops that prevent dead ends)
  { p1: [220, -140], p2: [260, 0], width: 14, lanes: 2, name: 'Harbor Coastal Link' },
  { p1: [260, 0], p2: [240, 160], width: 14, lanes: 2, name: 'Lakeside South Bypass' },
  { p1: [-230, -200], p2: [-260, -50], width: 10, lanes: 2, isMountain: true, name: 'Ridge Trail' },
  { p1: [-260, -50], p2: [-240, 130], width: 10, lanes: 2, name: 'Old Town West Pass' },
];

// Generate 3D Road Network with precise ground/bridge elevation
export const ROAD_NETWORK: RoadSegment[] = RAW_ROADS.map((r, idx) => {
  const y1 = getWorldElevation(r.p1[0], r.p1[1]);
  const y2 = getWorldElevation(r.p2[0], r.p2[1]);

  return {
    id: `road_${idx}`,
    p1: [r.p1[0], y1, r.p1[1]],
    p2: [r.p2[0], y2, r.p2[1]],
    width: r.width,
    lanes: r.lanes,
    isBridge: r.isBridge,
    isMountain: r.isMountain,
    name: r.name,
  };
});
