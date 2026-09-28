import * as THREE from 'three';
import { WeatherConfig, WeatherId } from '../../types/game';
import { soundSynth } from '../audio/SoundSynthesizer';
import { WEATHER_CONFIGS } from './WeatherConfigs';

export class WeatherController {
  private scene: THREE.Scene;
  private currentWeather: WeatherConfig = WEATHER_CONFIGS.sunny;

  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;
  private precipitationParticles: THREE.Points | null = null;
  private particleGeo: THREE.BufferGeometry | null = null;
  private particleMat: THREE.PointsMaterial | null = null;

  private lightningTimer: number = 0;
  private isLightningFlashing: boolean = false;
  private streetLamps: THREE.PointLight[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 2.0);
    this.sunLight.position.set(120, 200, 100);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 450;
    const shadowDist = 80;
    this.sunLight.shadow.camera.left = -shadowDist;
    this.sunLight.shadow.camera.right = shadowDist;
    this.sunLight.shadow.camera.top = shadowDist;
    this.sunLight.shadow.camera.bottom = -shadowDist;
    this.sunLight.shadow.bias = -0.001;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);
  }

  public setStreetLamps(lamps: THREE.PointLight[]): void {
    this.streetLamps = lamps;
    this.updateStreetLamps();
  }

  public applyWeather(id: WeatherId, particleDensity: 'low' | 'medium' | 'high' = 'medium'): WeatherConfig {
    const config = WEATHER_CONFIGS[id] || WEATHER_CONFIGS.sunny;
    this.currentWeather = config;

    // Sky & Fog
    this.scene.background = new THREE.Color(config.skyColor);
    this.scene.fog = new THREE.Fog(config.fogColor, config.fogNear, config.fogFar);

    // Sun / Moon
    this.sunLight.color.setHex(config.sunColor);
    this.sunLight.intensity = config.sunIntensity;
    this.ambientLight.color.setHex(config.ambientColor);
    this.ambientLight.intensity = config.ambientIntensity;
    this.hemiLight.color.setHex(config.skyColor);
    this.hemiLight.groundColor.setHex(config.isNight ? 0x050810 : 0x223322);

    // Precipitation particles
    this.setupPrecipitation(particleDensity);

    // Audio ambience
    if (config.hasPrecipitation && config.precipitationType === 'rain') {
      soundSynth.startRainAmbience();
    } else {
      soundSynth.stopRainAmbience();
    }

    this.updateStreetLamps();

    return config;
  }

  private updateStreetLamps(): void {
    const isNight = this.currentWeather.isNight;
    this.streetLamps.forEach((lamp) => {
      lamp.intensity = isNight ? 2.0 : 0.0;
    });
  }

  private setupPrecipitation(density: 'low' | 'medium' | 'high'): void {
    if (this.precipitationParticles) {
      this.scene.remove(this.precipitationParticles);
      this.particleGeo?.dispose();
      this.particleMat?.dispose();
      this.precipitationParticles = null;
    }

    if (!this.currentWeather.hasPrecipitation) return;

    const multiplier = density === 'low' ? 0.4 : density === 'medium' ? 1.0 : 1.6;
    const count = Math.floor(this.currentWeather.particleCount * multiplier);

    const positions = new Float32Array(count * 3);
    const range = 60; // follow camera in 60m radius

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * range;
      positions[i * 3 + 1] = Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * range;
    }

    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const isRain = this.currentWeather.precipitationType === 'rain';
    this.particleMat = new THREE.PointsMaterial({
      color: isRain ? 0x93c5fd : 0xffffff,
      size: isRain ? 0.35 : 0.65,
      transparent: true,
      opacity: isRain ? 0.7 : 0.9,
    });

    this.precipitationParticles = new THREE.Points(this.particleGeo, this.particleMat);
    this.scene.add(this.precipitationParticles);
  }

  public update(delta: number, cameraPos: THREE.Vector3, targetVehiclePos: THREE.Vector3): void {
    // Keep sun shadow centered on player vehicle
    this.sunLight.position.set(targetVehiclePos.x + 80, 160, targetVehiclePos.z + 60);
    this.sunLight.target.position.copy(targetVehiclePos);

    // Update camera-local precipitation particles
    if (this.precipitationParticles && this.particleGeo) {
      this.precipitationParticles.position.set(cameraPos.x, 0, cameraPos.z);

      const positions = this.particleGeo.attributes.position.array as Float32Array;
      const isRain = this.currentWeather.precipitationType === 'rain';
      const fallSpeed = isRain ? 48.0 : 7.0;
      const windX = (this.currentWeather.windSpeed || 0) * 0.4;

      for (let i = 0; i < positions.length / 3; i++) {
        // Fall down
        positions[i * 3 + 1] -= fallSpeed * delta;
        positions[i * 3] += windX * delta;

        // Wrap around height
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 28 + Math.random() * 4;
          positions[i * 3] = (Math.random() - 0.5) * 60;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
        }
      }
      this.particleGeo.attributes.position.needsUpdate = true;
    }

    // Lightning flashes in storm_night
    if (this.currentWeather.id === 'storm_night') {
      this.lightningTimer -= delta;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 6 + Math.random() * 12; // next flash in 6-18s
        this.triggerLightning();
      }
    }
  }

  private triggerLightning(): void {
    if (this.isLightningFlashing) return;
    this.isLightningFlashing = true;

    // Flash ambient light
    const origAmbient = this.ambientLight.intensity;
    this.ambientLight.intensity = 2.4;
    this.ambientLight.color.setHex(0xe0f2fe);

    setTimeout(() => {
      this.ambientLight.intensity = origAmbient;
      this.ambientLight.color.setHex(this.currentWeather.ambientColor);

      // Second micro flash
      setTimeout(() => {
        this.ambientLight.intensity = 1.8;
        setTimeout(() => {
          this.ambientLight.intensity = origAmbient;
          this.isLightningFlashing = false;
          // Thunder sound delayed by distance
          setTimeout(() => {
            soundSynth.playThunder();
          }, 400 + Math.random() * 800);
        }, 60);
      }, 100);
    }, 80);
  }
}
