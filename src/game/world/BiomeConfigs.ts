import { BiomeId, BiomeInfo } from '../../types/game';

export const BIOME_CONFIGS: Record<BiomeId, BiomeInfo> = {
  northbridge_city: {
    id: 'northbridge_city',
    name: 'Northbridge Metro District',
    tagline: '5 Open-World Districts, AI Traffic, Suspension Bridge & Transit Hubs',
    description: 'Explore the bustling metropolitan grid: Central Square Clock Tower, cobblestone Old Town alleys, industrial freight docks, and high mountain Pine Ridge switchbacks.',
    accentColor: '#3b82f6',
    groundBaseColor: 0x334155, // asphalt slate
    rockColor: 0x475569, // granite curb
    foliageColor: 0x166534, // park green
    waterColor: 0x0284c7, // bay blue
    landmarks: ['Central Clock Tower', 'Northbridge Suspension Bridge', 'Harbor Container Cranes', 'Pine Ridge Radio Mast'],
  },
  alpine_pass: {
    id: 'alpine_pass',
    name: 'Alpine Pass',
    tagline: 'High mountain switchbacks, pine forests & snowy peaks',
    description: 'Wind through pine forests, cross deep steel bridge gorges, pass timber cabins, and climb into cool alpine ridges.',
    accentColor: '#38bdf8',
    groundBaseColor: 0x2d4f26, // rich conifer green
    rockColor: 0x52525b, // slate grey
    foliageColor: 0x14532d, // dark spruce
    waterColor: 0x0284c7,
    landmarks: ['Canyon Truss Bridge', 'Summit Radio Mast', 'Timber Cabins', 'Alpine Glacier Viewpoint'],
  },
  coastal_highway: {
    id: 'coastal_highway',
    name: 'Coastal Highway',
    tagline: 'Cliffside ocean curves, sea breeze & lighthouses',
    description: 'Glide along high ocean bluffs with crashing surf, sandy beaches, coastal lighthouses, wooden boardwalks, and sunset vistas.',
    accentColor: '#0ea5e9',
    groundBaseColor: 0x65a30d, // coastal scrub
    rockColor: 0x78716c, // sandstone cliff
    foliageColor: 0x15803d, // wind-shaped coastal trees
    waterColor: 0x0369a1, // deep turquoise sea
    landmarks: ['Cape North Lighthouse', 'Ocean Bluff Turnout', 'Boardwalk Rest Stop', 'Tidepool Cove'],
  },
  green_valley: {
    id: 'green_valley',
    name: 'Green Valley',
    tagline: 'Rolling pastoral meadows, rustic barns & wandering rivers',
    description: 'Tranquil countryside cruise through sunlit meadows, traditional red barns, split-rail fencing, village shelters, and gentle hills.',
    accentColor: '#22c55e',
    groundBaseColor: 0x4d7c0f, // warm pasture green
    rockColor: 0x71717a, // river stone
    foliageColor: 0x166534, // lush deciduous
    waterColor: 0x0284c7,
    landmarks: ['Heritage Red Barn', 'River Stone Bridge', 'Village Bus Shelter', 'Valley Overlook'],
  },
};
