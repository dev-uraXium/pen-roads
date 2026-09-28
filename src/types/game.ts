export type VehicleId =
  | 'city_car'
  | 'taxi_sedan'
  | 'delivery_van'
  | 'city_bus'
  | 'box_truck'
  | 'motorbike'
  | 'camper_van';

export type BiomeId = 'northbridge_city' | 'alpine_pass' | 'coastal_highway' | 'green_valley';

export type WeatherId =
  | 'clear_morning'
  | 'sunny_afternoon'
  | 'sunset'
  | 'rainy_day'
  | 'snowy_day'
  | 'clear_night'
  | 'storm_night'
  | 'sunny'
  | 'rainy'
  | 'snowy';

export type GameMode =
  | 'pure_drive'
  | 'guided_drive'
  | 'work_route'
  | 'free_drive'
  | 'quick_job'
  | 'career';

export type RoadStyle = 'scenic_winding' | 'high_speed_highway' | 'mountain_pass';

export interface BiomeInfo {
  id: BiomeId;
  name: string;
  tagline: string;
  description: string;
  accentColor: string;
  groundBaseColor: number;
  rockColor: number;
  foliageColor: number;
  waterColor?: number;
  landmarks: string[];
}

export interface PointOfInterest {
  id: string;
  name: string;
  type: 'rest_stop' | 'viewpoint' | 'shelter' | 'depot' | 'bridge';
  position: [number, number, number];
  rotationY: number;
  description: string;
  hasJobOpportunity?: boolean;
}

export type DistrictId = 'central_square' | 'old_town' | 'industrial_yard' | 'lakeside_highway' | 'pine_ridge';

export type JobType = 'passenger' | 'bus_route' | 'cargo' | 'courier';

export interface VehicleConfig {
  id: VehicleId;
  name: string;
  category: string;
  description: string;
  price: number;
  topSpeed: number; // km/h
  acceleration: number; // 0-100 rating
  braking: number;
  handling: number;
  passengerCapacity: number;
  cargoCapacity: number; // units
  unlockedByDefault: boolean;
  color: string;
  availableColors: string[];
  wheelStyle: 'standard' | 'sport' | 'heavy' | 'classic';
  bodyDimensions: {
    width: number;
    height: number;
    length: number;
    wheelbase: number;
  };
}

export interface WeatherConfig {
  id: WeatherId;
  name: string;
  description: string;
  skyColor: number;
  horizonColor: number;
  sunColor: number;
  sunIntensity: number;
  ambientColor: number;
  ambientIntensity: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  gripMultiplier: number;
  isNight: boolean;
  hasPrecipitation: boolean;
  precipitationType?: 'rain' | 'snow';
  particleCount: number;
  windSpeed: number;
  roadWetness: number;
}

export interface DistrictInfo {
  id: DistrictId;
  name: string;
  tagline: string;
  center: [number, number]; // [x, z]
  radius: number;
  color: string;
  landmark: string;
  bestActivities: string;
}

export interface BusStop {
  id: string;
  name: string;
  position: [number, number, number]; // [x, y, z]
  direction: number; // angle in radians
  district: DistrictId;
}

export interface BusPassenger {
  id: string;
  name: string;
  ticketType: string;
  isValid: boolean;
  status?: 'pending' | 'accepted' | 'rejected';
}

export interface DeliveryParcel {
  id: string;
  name: string;
  destinationName: string;
  position: [number, number, number];
  district: DistrictId;
  isFragile: boolean;
  delivered: boolean;
  condition: number; // 0 to 100
}

export interface ReverseParkingBay {
  position: [number, number, number];
  rotationY: number;
  width: number;
  length: number;
  isAligned: boolean;
  distanceToCenter: number;
}

export interface PassengerDialogue {
  text: string;
  mood: 'happy' | 'neutral' | 'annoyed' | 'panicked';
  timestamp: number;
}

export interface JobDefinition {
  id: string;
  title: string;
  type: JobType;
  districtFrom: DistrictId;
  districtTo: DistrictId;
  vehicleRequirement?: VehicleId[];
  baseReward: number;
  pickupPos: [number, number, number];
  dropoffPos: [number, number, number];
  targetName: string;
  busStops?: BusStop[];
  currentBusStopIndex?: number;
  ticketsSold?: number;
  totalTicketsNeeded?: number;
  passengerQueue?: BusPassenger[];
  currentPassengerIndex?: number;
  dodgersCaught?: number;
  legScheduleSeconds?: number;
  legTimeRemaining?: number;
  cargoHealth?: number; // 100 max
  passengerComfort?: number; // 100 max
  passengerDialogue?: PassengerDialogue;
  parcels?: DeliveryParcel[];
  activeParcelIndex?: number;
  parkingBay?: ReverseParkingBay;
  nearMissCount?: number;
  nearMissMultiplier?: number;
  timeLimitSeconds?: number;
  elapsedSeconds?: number;
  weatherBonusPct: number;
}

export interface JobResult {
  job: JobDefinition;
  success: boolean;
  baseReward: number;
  safetyBonus: number;
  weatherBonus: number;
  penalties: number;
  finalReward: number;
  reputationGained: number;
  timeTakenFormatted: string;
  specialBonusName?: string;
  specialBonusAmount?: number;
}

export interface GraphicsSettings {
  quality: 'low' | 'medium' | 'high';
  renderScale: number;
  shadows: boolean;
  particleDensity: 'low' | 'medium' | 'high';
  trafficDensity: 'low' | 'medium' | 'high';
  bloom: boolean;
}

export interface AudioSettings {
  masterVolume: number;
  engineVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
  muted: boolean;
}

export interface PlayerStats {
  credits: number;
  reputationXp: number;
  reputationLevel: number;
  reputationTitle: string;
  jobsCompleted: number;
  unlockedVehicles: VehicleId[];
  selectedVehicle: VehicleId;
  selectedColor: string;
  selectedWheel: string;
  selectedWeather: WeatherId;
  selectedMode: GameMode;
  selectedBiome: BiomeId;
  selectedRoadStyle: RoadStyle;
  seed: number;
  enableJobs: boolean;
}

export interface ControlSettings {
  touchControlMode: 'steering_wheel' | 'steering_pad';
  steeringSensitivity: number;
  tiltSteering: boolean;
}
