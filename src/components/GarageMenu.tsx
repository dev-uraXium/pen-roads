import {
  Award,
  ChevronRight,
  CloudLightning,
  CloudRain,
  Compass,
  DollarSign,
  Moon,
  Play,
  RotateCcw,
  Snowflake,
  Sun,
  Truck,
  Users,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { VEHICLE_CONFIGS } from '../game/vehicle/VehicleConfigs';
import { WEATHER_CONFIGS } from '../game/world/WeatherConfigs';
import { AVAILABLE_JOBS } from '../game/jobs/JobSystem';
import { GameMode, PlayerStats, VehicleId, WeatherId } from '../types/game';

interface GarageMenuProps {
  playerStats: PlayerStats;
  onStartDrive: (vehicleId: VehicleId, color: string, weatherId: WeatherId, mode: GameMode, jobId?: string) => void;
  onUnlockVehicle: (vehicleId: VehicleId) => void;
}

export const GarageMenu: React.FC<GarageMenuProps> = ({
  playerStats,
  onStartDrive,
  onUnlockVehicle,
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleId>(playerStats.selectedVehicle);
  const [selectedColor, setSelectedColor] = useState<string>(playerStats.selectedColor);
  const [selectedWeather, setSelectedWeather] = useState<WeatherId>(playerStats.selectedWeather);
  const [selectedMode, setSelectedMode] = useState<GameMode>(playerStats.selectedMode);
  const [selectedJobId, setSelectedJobId] = useState<string>(AVAILABLE_JOBS[0].id);

  const curConfig = VEHICLE_CONFIGS[selectedVehicle];
  const isUnlocked = playerStats.unlockedVehicles.includes(selectedVehicle);
  const canAfford = playerStats.credits >= curConfig.price;

  // Filter jobs compatible with selected vehicle
  const compatibleJobs = AVAILABLE_JOBS.filter(
    (j) => !j.vehicleRequirement || j.vehicleRequirement.includes(selectedVehicle)
  );

  const handleLaunch = () => {
    if (!isUnlocked) return;
    onStartDrive(selectedVehicle, selectedColor, selectedWeather, selectedMode, selectedMode === 'quick_job' ? selectedJobId : undefined);
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white flex flex-col justify-between overflow-x-hidden">
      {/* Hero Showcase Background Banner with Gradient Scrim */}
      <div className="absolute inset-0 z-0 opacity-40">
        <img
          src="/src/assets/images/garage_showroom_banner_1790172660418.jpg"
          alt="Northbridge Garage Showroom"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
      </div>

      {/* Top Header Bar Contract */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 backdrop-blur-md bg-slate-950/40">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-xl tracking-tight text-white">
            Open Roads: All Seasons
          </span>
          <span className="hidden sm:inline text-xs text-slate-400">·</span>
          <span className="hidden sm:inline text-xs text-slate-300">Northbridge Driving Sandbox</span>
        </div>

        {/* Driver Profile & Credits */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs">
            <Award className="w-4 h-4 text-sky-400" />
            <span className="text-slate-300 font-medium">{playerStats.reputationTitle}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400 font-mono">Lv. {playerStats.reputationLevel}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-bold font-mono text-xs">
            <DollarSign className="w-3.5 h-3.5" />
            <span>{playerStats.credits} Credits</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 Cols): Vehicle Selector & Specs */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              Garage Bay 01
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
              Select Your Vehicle
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Each vehicle has distinct physics, cargo capacities, passenger roles, and handling characteristics.
            </p>
          </div>

          {/* Vehicle Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.values(VEHICLE_CONFIGS).map((v) => {
              const unlocked = playerStats.unlockedVehicles.includes(v.id);
              const active = selectedVehicle === v.id;

              return (
                <div
                  key={v.id}
                  onClick={() => {
                    setSelectedVehicle(v.id);
                    setSelectedColor(v.color);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    active
                      ? 'bg-sky-950/60 border-sky-500 shadow-xl shadow-sky-500/10'
                      : unlocked
                      ? 'bg-slate-900/60 border-white/10 hover:border-white/30'
                      : 'bg-slate-950/40 border-white/5 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>{v.category}</span>
                      {!unlocked && <span className="font-mono text-amber-400">${v.price}</span>}
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-white truncate">{v.name}</h3>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2">
                    <span>{v.topSpeed} km/h</span>
                    <span>{v.passengerCapacity > 0 ? `${v.passengerCapacity} Pass` : `${v.cargoCapacity} Cargo`}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Vehicle Detail Card */}
          <div className="p-5 rounded-3xl bg-slate-900/80 backdrop-blur-md border border-white/10 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                  {curConfig.category}
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">{curConfig.name}</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-lg">
                  {curConfig.description}
                </p>
              </div>

              {!isUnlocked && (
                <button
                  onClick={() => onUnlockVehicle(curConfig.id)}
                  disabled={!canAfford}
                  className={`px-4 py-2 rounded-xl font-bold text-xs shadow-lg transition-all ${
                    canAfford
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Unlock for ${curConfig.price}
                </button>
              )}
            </div>

            {/* Performance Gauges */}
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-white/10 text-xs">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Top Speed</span>
                  <span className="font-mono text-white font-bold">{curConfig.topSpeed} km/h</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500" style={{ width: `${(curConfig.topSpeed / 180) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Acceleration</span>
                  <span className="font-mono text-white font-bold">{curConfig.acceleration}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${curConfig.acceleration}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Handling</span>
                  <span className="font-mono text-white font-bold">{curConfig.handling}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${curConfig.handling}%` }} />
                </div>
              </div>
            </div>

            {/* Color Swatches */}
            <div className="pt-2 border-t border-white/10 flex items-center gap-3">
              <span className="text-xs text-slate-400">Paint Finish:</span>
              <div className="flex items-center gap-2">
                {curConfig.availableColors.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => setSelectedColor(hex)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      selectedColor === hex ? 'scale-125 border-white shadow-md' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols): Weather & Game Mode Launcher */}
        <div className="lg:col-span-5 space-y-6">
          {/* Weather Preset Selector */}
          <div className="p-5 rounded-3xl bg-slate-900/80 backdrop-blur-md border border-white/10 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Atmosphere & Road Condition
            </span>
            <h3 className="font-bold text-sm text-white">Weather Preset</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: 'sunny', name: 'Sunny Day', icon: Sun, desc: 'Dry road · Max grip (100%)' },
                { id: 'rainy', name: 'Rainy Afternoon', icon: CloudRain, desc: 'Wet sheen · Slick braking' },
                { id: 'snowy', name: 'Snowy Morning', icon: Snowflake, desc: 'Frosty · Drift handling (+35% pay)' },
                { id: 'clear_night', name: 'Clear Night', icon: Moon, desc: 'Headlights & Streetlamps' },
                { id: 'storm_night', name: 'Storm Night', icon: CloudLightning, desc: 'Heavy rain & lightning' },
              ].map((w) => {
                const Icon = w.icon;
                const isWActive = selectedWeather === w.id;

                return (
                  <div
                    key={w.id}
                    onClick={() => setSelectedWeather(w.id as WeatherId)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                      isWActive
                        ? 'bg-amber-950/50 border-amber-500 shadow-md text-amber-300'
                        : 'bg-slate-800/40 border-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">{w.name}</div>
                      <div className="text-[10px] text-slate-400">{w.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mode Selector */}
          <div className="p-5 rounded-3xl bg-slate-900/80 backdrop-blur-md border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Mode Selection
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'free_drive', label: 'Free Drive', desc: 'No timer or job pressure' },
                { id: 'quick_job', label: 'Quick Contract', desc: 'Passenger, bus or cargo work' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMode(m.id as GameMode)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedMode === m.id
                      ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-800/40 border-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="font-bold text-xs">{m.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>

            {/* If Quick Job selected, show available contracts matching vehicle */}
            {selectedMode === 'quick_job' && (
              <div className="pt-2 border-t border-white/10 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400">Recommended Job:</span>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {compatibleJobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                        selectedJobId === job.id
                          ? 'bg-sky-950/70 border-sky-400 text-white'
                          : 'bg-slate-800/30 border-white/5 text-slate-400 hover:border-white/15'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-white truncate max-w-[200px]">{job.title}</div>
                        <div className="text-[10px] text-slate-400 uppercase">{job.type.replace('_', ' ')}</div>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">+${job.baseReward}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Launch Primary CTA Button */}
            <button
              onClick={handleLaunch}
              disabled={!isUnlocked}
              className={`w-full py-4 px-6 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-3 shadow-2xl transition-all ${
                isUnlocked
                  ? 'bg-sky-400 hover:bg-sky-300 text-slate-950 shadow-sky-400/25 active:scale-98'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>{isUnlocked ? 'START DRIVING NORTHBRIDGE' : 'VEHICLE LOCKED'}</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 px-6 py-3 border-t border-white/5 text-center text-[11px] text-slate-500 backdrop-blur-sm bg-slate-950/60">
        Northbridge Open Roads · 5 Connected Districts · Dynamic Weather & WebGL Arcade Driving Simulation
      </footer>
    </div>
  );
};
