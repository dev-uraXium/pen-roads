import React from 'react';
import { Compass, Car, CloudSun, Play, Settings, Briefcase, Sparkles, Navigation } from 'lucide-react';
import { BiomeId, PlayerStats, WeatherId } from '../types/game';
import { BIOME_CONFIGS } from '../game/world/BiomeConfigs';
import { WEATHER_CONFIGS } from '../game/world/WeatherConfigs';
import { VEHICLE_CONFIGS } from '../game/vehicle/VehicleConfigs';

interface TitleScreenProps {
  stats: PlayerStats;
  onDriveNow: () => void;
  onOpenCustomize: () => void;
  onOpenGarage: () => void;
  onOpenJobs: () => void;
  onOpenSettings: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  stats,
  onDriveNow,
  onOpenCustomize,
  onOpenGarage,
  onOpenJobs,
  onOpenSettings,
}) => {
  const currentBiome = BIOME_CONFIGS[stats.selectedBiome] || BIOME_CONFIGS.alpine_pass;
  const currentWeather = WEATHER_CONFIGS[stats.selectedWeather] || WEATHER_CONFIGS.clear_morning;
  const currentVehicle = VEHICLE_CONFIGS[stats.selectedVehicle] || VEHICLE_CONFIGS.city_car;

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-6 md:p-12 pointer-events-none select-none bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40">
      {/* Top Header */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center backdrop-blur-md shadow-lg shadow-amber-500/10">
            <Compass className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-400/90 font-semibold">Endless Scenic Driving</div>
            <div className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Open Roads <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">All Seasons</span>
            </div>
          </div>
        </div>

        {/* Currency & Reputation */}
        <div className="hidden sm:flex items-center gap-4 bg-slate-900/70 border border-slate-800/80 backdrop-blur-md rounded-2xl px-4 py-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-amber-400">{stats.credits.toLocaleString()}</span> Cr
          </div>
          <div className="w-px h-3 bg-slate-700" />
          <div className="text-slate-400">
            Rank: <span className="text-white font-medium">{stats.reputationTitle}</span>
          </div>
        </div>
      </div>

      {/* Center Hero Information */}
      <div className="max-w-xl pointer-events-auto my-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 backdrop-blur-md text-xs text-slate-300">
          <Navigation className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
          <span>Procedural Route • Seed: {stats.seed}</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight drop-shadow-md">
          Take the long way home.
        </h1>
        <p className="text-sm md:text-base text-slate-300/90 leading-relaxed font-normal max-w-lg drop-shadow">
          A calm, endless scenic driving escape. Choose your vehicle, landscape, and weather, then cruise indefinitely along winding procedural roads with optional roadside jobs.
        </p>

        {/* Active Journey Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            onClick={onOpenCustomize}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/70 backdrop-blur-md text-xs text-white transition-all shadow-sm"
          >
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-medium">{currentBiome.name}</span>
          </button>

          <button
            onClick={onOpenCustomize}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/70 backdrop-blur-md text-xs text-white transition-all shadow-sm"
          >
            <CloudSun className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium">{currentWeather.name}</span>
          </button>

          <button
            onClick={onOpenGarage}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/70 backdrop-blur-md text-xs text-white transition-all shadow-sm"
          >
            <Car className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium">{currentVehicle.name}</span>
          </button>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pointer-events-auto">
        {/* Primary Launch Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={onDriveNow}
            className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-bold text-base shadow-xl shadow-amber-500/25 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>Drive Now</span>
          </button>

          <button
            onClick={onOpenCustomize}
            className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 active:scale-95 text-white font-medium text-sm backdrop-blur-md transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4 text-sky-400" />
            <span>Customize Drive</span>
          </button>
        </div>

        {/* Secondary Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenGarage}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white backdrop-blur-md transition-all"
          >
            <Car className="w-4 h-4 text-emerald-400" />
            <span>Vehicles</span>
          </button>

          <button
            onClick={onOpenJobs}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white backdrop-blur-md transition-all"
          >
            <Briefcase className="w-4 h-4 text-amber-400" />
            <span>Jobs</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center justify-center p-3 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white backdrop-blur-md transition-all"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
