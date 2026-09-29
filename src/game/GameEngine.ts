import * as THREE from 'three';
import { BiomeId, GraphicsSettings, JobResult, PointOfInterest, VehicleConfig, VehicleId, WeatherId } from '../types/game';
import { soundSynth } from './audio/SoundSynthesizer';
import { JobSystem } from './jobs/JobSystem';
import { ProceduralRouteStreamer } from './procedural/ProceduralRouteStreamer';
import { VEHICLE_CONFIGS } from './vehicle/VehicleConfigs';
import { VehicleMeshRig, VehicleModelBuilder } from './vehicle/VehicleModelBuilder';
import { CollisionBox, VehicleInput, VehiclePhysics } from './vehicle/VehiclePhysics';
import { BuiltWorld, CityBuilder } from './world/CityBuilder';
import { TrafficSystem } from './world/TrafficSystem';
import { WeatherController } from './world/WeatherController';
import { getWorldElevation } from './world/WorldElevation';

export type CameraViewMode = 'chase' | 'hood' | 'cabin';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;

  // Systems
  public weatherCtrl!: WeatherController;
  public trafficSys!: TrafficSystem;
  public jobSys: JobSystem = new JobSystem();
  public builtWorld!: BuiltWorld;

  // Procedural Endless Route System
  public isEndlessMode: boolean = true;
  public routeStreamer: ProceduralRouteStreamer | null = null;
  public currentBiome: BiomeId = 'alpine_pass';
  public currentSeed: number = 42;
  public currentPOI: PointOfInterest | null = null;

  // Active Vehicle
  public currentVehicleConfig: VehicleConfig = VEHICLE_CONFIGS.city_car;
  public vehicleRig: VehicleMeshRig | null = null;
  public vehiclePhysics: VehiclePhysics | null = null;
  public headlightsOn: boolean = false;

  // Camera
  public cameraMode: CameraViewMode = 'chase';
  private targetCameraPos: THREE.Vector3 = new THREE.Vector3();
  private targetCameraLook: THREE.Vector3 = new THREE.Vector3();

  // Input
  public input: VehicleInput = {
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    reverse: false,
  };
  private keysPressed: Record<string, boolean> = {};

  // Loop & timing
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private animFrameId: number = 0;

  // Settings
  private graphicsSettings: GraphicsSettings = {
    quality: 'medium',
    renderScale: 1.0,
    shadows: true,
    particleDensity: 'medium',
    trafficDensity: 'medium',
    bloom: false,
  };

  // Callbacks
  public onTelemetryUpdate?: (data: {
    speedKmh: number;
    gear: string;
    rpm: number;
    playerPos: [number, number];
    playerHeading: number;
    isDrifting: boolean;
    isJackknifing: boolean;
  }) => void;

  public onJobUpdate?: (data: {
    canInteract: boolean;
    promptText: string;
    targetPos: [number, number, number] | null;
  }) => void;

  public onJobCompleted?: (result: JobResult) => void;
  public onPOINearby?: (poi: PointOfInterest | null) => void;
  public onNearMiss?: (bonus: number, combo: number) => void;
  public onPassengerDialogue?: (text: string, mood: 'happy' | 'neutral' | 'annoyed' | 'panicked') => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.init();
  }

  private init(): void {
    // 1. Scene & Renderer
    this.scene = new THREE.Scene();

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.renderer.setPixelRatio(dpr);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Handle WebGL context loss safely
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.pause();
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.resume();
    });

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(65, this.canvas.clientWidth / this.canvas.clientHeight, 0.5, 900);
    this.camera.position.set(0, 10, 20);

    // 3. Build Northbridge City & Districts (kept as optional or backdrop)
    this.builtWorld = CityBuilder.buildWorld();
    this.scene.add(this.builtWorld.root);
    this.builtWorld.root.visible = false; // default to endless scenic mode

    // 4. Weather & Atmosphere
    this.weatherCtrl = new WeatherController(this.scene);
    this.weatherCtrl.setStreetLamps(this.builtWorld.streetLamps);

    // 5. Traffic AI
    this.trafficSys = new TrafficSystem();
    this.scene.add(this.trafficSys.root);
    this.trafficSys.init(6);

    // 6. Initialize Endless Route Streamer
    this.setBiome('alpine_pass', 42);

    // 7. Spawn Default Vehicle
    this.spawnVehicle('city_car');

    // 8. Setup Inputs
    this.setupKeyboardListeners();

    // 9. Handle Window Resizing
    window.addEventListener('resize', this.handleResize);
  }

  public setBiome(biomeId: BiomeId, seed: number = 42): void {
    this.currentBiome = biomeId;
    this.currentSeed = seed;

    if (biomeId === 'northbridge_city') {
      this.isEndlessMode = false;
      if (this.builtWorld) {
        this.builtWorld.root.visible = true;
      }
      if (this.routeStreamer) {
        this.routeStreamer.dispose();
        this.routeStreamer = null;
      }

      this.trafficSys.setMode(false);

      if (this.vehiclePhysics) {
        this.vehiclePhysics.setElevationSampler((x, z) => getWorldElevation(x, z));
        this.vehiclePhysics.setCollisionBoxes(this.builtWorld.collisionBoxes);
        const spawnX = 4;
        const spawnZ = -30;
        const spawnY = getWorldElevation(spawnX, spawnZ);
        this.vehiclePhysics.reset(new THREE.Vector3(spawnX, spawnY, spawnZ), 0);
      }
      return;
    }

    this.isEndlessMode = true;
    this.trafficSys.setMode(true);

    if (this.builtWorld) {
      this.builtWorld.root.visible = false;
    }

    if (this.routeStreamer) {
      this.routeStreamer.dispose();
    }

    this.routeStreamer = new ProceduralRouteStreamer(this.scene, biomeId, seed);
    this.routeStreamer.onPOINearby = (poi) => {
      this.currentPOI = poi;
      if (this.onPOINearby) {
        this.onPOINearby(poi);
      }
    };

    if (this.vehiclePhysics) {
      this.vehiclePhysics.setElevationSampler((x, z) => {
        return this.routeStreamer ? this.routeStreamer.getClosestRoadPoint(x, z).elevation : getWorldElevation(x, z);
      });
      const spawn = this.routeStreamer.getSpawnTransform(15);
      this.vehiclePhysics.reset(spawn.position, spawn.heading);
    }
  }

  public setGraphics(settings: Partial<GraphicsSettings>): void {
    this.graphicsSettings = { ...this.graphicsSettings, ...settings };

    // Apply render scale
    const baseDpr = this.graphicsSettings.quality === 'low' ? 0.75 : this.graphicsSettings.quality === 'medium' ? 1.0 : 1.25;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, baseDpr * this.graphicsSettings.renderScale));

    // Shadow maps
    this.renderer.shadowMap.enabled = this.graphicsSettings.shadows && this.graphicsSettings.quality !== 'low';

    // Traffic density
    this.trafficSys.setDensity(this.graphicsSettings.trafficDensity);
  }

  public setWeather(weatherId: WeatherId): void {
    const config = this.weatherCtrl.applyWeather(weatherId, this.graphicsSettings.particleDensity);
    if (this.vehiclePhysics) {
      this.vehiclePhysics.setWeatherGrip(config.gripMultiplier);
    }
    CityBuilder.setWeatherTheme(this.builtWorld, weatherId === 'snowy' || weatherId === 'snowy_day', weatherId === 'rainy' || weatherId === 'rainy_day' || weatherId === 'storm_night');

    // Toggle headlights automatically in night or storm
    if (config.isNight || weatherId === 'storm_night' || weatherId === 'clear_night') {
      this.headlightsOn = true;
      if (this.vehicleRig) {
        VehicleModelBuilder.setHeadlights(this.vehicleRig, true);
      }
    }
  }

  public spawnVehicle(vehicleId: VehicleId, customColor?: string, customWheel?: string): void {
    const config = VEHICLE_CONFIGS[vehicleId] || VEHICLE_CONFIGS.city_car;
    this.currentVehicleConfig = config;

    // Remove existing vehicle
    if (this.vehicleRig) {
      this.scene.remove(this.vehicleRig.root);
    }

    // Build new 3D model
    this.vehicleRig = VehicleModelBuilder.createVehicle(config, customColor);
    this.scene.add(this.vehicleRig.root);

    // Setup Physics
    this.vehiclePhysics = new VehiclePhysics(config, this.vehicleRig);

    if (this.isEndlessMode && this.routeStreamer) {
      this.vehiclePhysics.setElevationSampler((x, z) => {
        return this.routeStreamer ? this.routeStreamer.getClosestRoadPoint(x, z).elevation : getWorldElevation(x, z);
      });
      const spawn = this.routeStreamer.getSpawnTransform(15);
      this.vehiclePhysics.reset(spawn.position, spawn.heading);
    } else {
      this.vehiclePhysics.setCollisionBoxes(this.builtWorld.collisionBoxes);
      const spawnX = 4;
      const spawnZ = -30;
      const spawnY = getWorldElevation(spawnX, spawnZ);
      this.vehiclePhysics.reset(new THREE.Vector3(spawnX, spawnY, spawnZ), 0);
    }

    // Collision callback
    this.vehiclePhysics.onCollision = (impactSpeed) => {
      this.jobSys.registerCollision(impactSpeed);
    };

    // Near-miss callback
    this.vehiclePhysics.onNearMiss = (bonus, combo) => {
      this.jobSys.registerNearMiss(bonus);
      this.onNearMiss?.(bonus, combo);
    };

    // Passenger feedback callback
    this.vehiclePhysics.onPassengerFeedback = (text, mood) => {
      if (this.jobSys.activeJob) {
        this.jobSys.activeJob.passengerDialogue = { text, mood, timestamp: Date.now() };
      }
      this.onPassengerDialogue?.(text, mood);
    };

    // Headlight state
    VehicleModelBuilder.setHeadlights(this.vehicleRig, this.headlightsOn);
  }

  public resetVehicleToSpawn(): void {
    if (!this.vehiclePhysics) return;
    if (this.isEndlessMode && this.routeStreamer) {
      const currentDist = Math.max(15, this.vehiclePhysics.position.z);
      const spawn = this.routeStreamer.getSpawnTransform(currentDist);
      this.vehiclePhysics.reset(spawn.position, spawn.heading);
    } else {
      const spawnX = 4;
      const spawnZ = -30;
      const spawnY = getWorldElevation(spawnX, spawnZ);
      this.vehiclePhysics.reset(new THREE.Vector3(spawnX, spawnY, spawnZ), 0);
    }
  }

  public interactPOI(): { success: boolean; message: string; credits: number; xp: number } | null {
    if (!this.currentPOI) return null;
    const p = this.currentPOI;
    let message = '';
    let credits = 0;
    let xp = 0;

    switch (p.type) {
      case 'rest_stop':
        message = `Rested at ${p.name}! Enjoyed the refreshing mountain air and tranquil landscape.`;
        credits = 50;
        xp = 75;
        break;
      case 'viewpoint':
        message = `Discovered scenic overlook at ${p.name}! Breathtaking panoramic photograph captured.`;
        credits = 75;
        xp = 100;
        break;
      case 'shelter':
        message = `Boarded scenic route travelers at ${p.name}! Passengers seated comfortably.`;
        credits = 180;
        xp = 120;
        break;
      case 'depot':
        message = `Loaded local cargo freight crates at ${p.name}! Shipment secured in cargo bay.`;
        credits = 220;
        xp = 140;
        break;
      case 'bridge':
      default:
        message = `Crossed majestic engineering span at ${p.name}!`;
        credits = 40;
        xp = 60;
        break;
    }

    soundSynth.playJobRewardFanfare();
    return { success: true, message, credits, xp };
  }

  public cycleCamera(): CameraViewMode {
    const modes: CameraViewMode[] = ['chase', 'hood', 'cabin'];
    const curIdx = modes.indexOf(this.cameraMode);
    this.cameraMode = modes[(curIdx + 1) % modes.length];
    return this.cameraMode;
  }

  public toggleHeadlights(): boolean {
    this.headlightsOn = !this.headlightsOn;
    if (this.vehicleRig) {
      VehicleModelBuilder.setHeadlights(this.vehicleRig, this.headlightsOn);
    }
    return this.headlightsOn;
  }

  public interact(): void {
    const activeWeatherId = (this.weatherCtrl as unknown as { currentWeather?: { id: WeatherId } }).currentWeather?.id || 'sunny';
    const res = this.jobSys.handleInteract(activeWeatherId);

    if (this.vehicleRig && this.currentVehicleConfig.id === 'city_bus') {
      VehicleModelBuilder.toggleBusDoors(this.vehicleRig, this.jobSys.busDoorsOpen);
    }

    if (res.isComplete && res.result && this.onJobCompleted) {
      this.onJobCompleted(res.result);
    }
  }

  // Keyboard controls
  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keysPressed[e.code] = true;
      soundSynth.ensureContext();

      if (e.code === 'KeyC') {
        this.cycleCamera();
      }
      if (e.code === 'KeyL') {
        this.toggleHeadlights();
      }
      if (e.code === 'KeyH') {
        soundSynth.startHorn();
      }
      if (e.code === 'KeyE') {
        this.interact();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed[e.code] = false;
      if (e.code === 'KeyH') {
        soundSynth.stopHorn();
      }
    });
  }

  private pollKeyboardInput(): void {
    // Up / W: Throttle
    const isUp = this.keysPressed['KeyW'] || this.keysPressed['ArrowUp'];
    // Down / S: Brake / Reverse
    const isDown = this.keysPressed['KeyS'] || this.keysPressed['ArrowDown'];
    // Left / A: Steer Left
    const isLeft = this.keysPressed['KeyA'] || this.keysPressed['ArrowLeft'];
    // Right / D: Steer Right
    const isRight = this.keysPressed['KeyD'] || this.keysPressed['ArrowRight'];
    // Space: Handbrake
    const isHandbrake = !!this.keysPressed['Space'];

    if (isUp) {
      this.input.throttle = 1;
    } else if (this.input.throttle === 1) {
      this.input.throttle = 0;
    }

    if (isDown) {
      this.input.brake = 1;
    } else if (this.input.brake === 1) {
      this.input.brake = 0;
    }

    if (isLeft && !isRight) {
      this.input.steer = -1;
    } else if (isRight && !isLeft) {
      this.input.steer = 1;
    } else if (this.input.steer === 1 || this.input.steer === -1) {
      this.input.steer = 0;
    }

    this.input.handbrake = isHandbrake;
  }

  // Start & Main Loop
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    soundSynth.startEngine(this.currentVehicleConfig.id);
    this.loop();
  }

  public pause(): void {
    this.isRunning = false;
    cancelAnimationFrame(this.animFrameId);
    soundSynth.stopEngine();
    soundSynth.stopTireSkid();
    soundSynth.stopHorn();
  }

  public resume(): void {
    if (!this.isRunning) {
      this.start();
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.update(delta);
    this.render();
  };

  private update(delta: number): void {
    this.pollKeyboardInput();

    if (this.vehiclePhysics && this.vehicleRig) {
      // Stream procedural route segments ahead and recycle behind
      let baseBoxes: CollisionBox[] = [];
      let activeColliders: THREE.Object3D[] = [];

      if (this.isEndlessMode && this.routeStreamer) {
        baseBoxes = this.routeStreamer.update(this.vehiclePhysics.position);
        activeColliders = this.routeStreamer.getTerrainColliders();
      } else if (this.builtWorld) {
        baseBoxes = this.builtWorld.collisionBoxes;
        activeColliders = [this.builtWorld.root];
      }

      // Sync passenger state
      this.vehiclePhysics.hasPassenger = !!(
        this.jobSys.activeJob &&
        this.jobSys.activeJob.type === 'passenger' &&
        this.jobSys.jobStage === 'in_transit'
      );

      // Update vehicle physics
      this.vehiclePhysics.update(delta, this.input);

      // Brake lights
      VehicleModelBuilder.setBraking(this.vehicleRig, this.input.brake > 0.1 || this.input.handbrake);

      // Update camera positioning
      this.updateCamera(delta);

      // Weather & Sky updates
      this.weatherCtrl.update(delta, this.camera.position, this.vehiclePhysics.position);

      // Traffic AI updates with real raycast terrain height
      this.trafficSys.update(
        delta,
        this.vehiclePhysics.position,
        this.headlightsOn,
        this.isEndlessMode,
        this.routeStreamer,
        activeColliders
      );

      // Combine world/streamer collision boxes with moving traffic boxes
      const trafficBoxes = this.trafficSys.getCollisionBoxes();
      this.vehiclePhysics.setCollisionBoxes([...baseBoxes, ...trafficBoxes]);

      // Beacon & Objective update
      this.updateObjectiveZone(delta);

      // Telemetry
      if (this.onTelemetryUpdate) {
        this.onTelemetryUpdate({
          speedKmh: this.vehiclePhysics.speedKmh,
          gear: this.vehiclePhysics.gear,
          rpm: this.vehiclePhysics.rpm,
          playerPos: [this.vehiclePhysics.position.x, this.vehiclePhysics.position.z],
          playerHeading: this.vehiclePhysics.rotationY,
          isDrifting: this.vehiclePhysics.isDrifting,
          isJackknifing: this.vehiclePhysics.isJackknifing,
        });
      }
    }

    // Blinking radio mast summit beacon
    if (this.builtWorld.beaconLight) {
      const beaconTime = performance.now() * 0.003;
      (this.builtWorld.beaconLight.material as THREE.MeshBasicMaterial).color.setHex(Math.sin(beaconTime) > 0 ? 0xff0000 : 0x330000);
    }
  }

  private updateObjectiveZone(delta: number): void {
    if (!this.vehiclePhysics) return;

    const target = this.jobSys.getTargetPosition();
    const marker = this.builtWorld.objectiveMarkerGroup;

    if (target) {
      marker.position.set(target[0], target[1], target[2]);
      marker.visible = true;

      // Rotate diamond indicator
      marker.children.forEach((c) => {
        if (c instanceof THREE.Mesh && c.geometry instanceof THREE.OctahedronGeometry) {
          c.rotation.y += delta * 2.5;
        }
      });

      const isStationary = Math.abs(this.vehiclePhysics.speed) < 1.0;
      const jobStatus = this.jobSys.update(delta, this.vehiclePhysics.position, isStationary, this.vehiclePhysics.rotationY);

      if (this.onJobUpdate) {
        this.onJobUpdate({
          canInteract: jobStatus.canInteract,
          promptText: jobStatus.promptText,
          targetPos: target,
        });
      }

      if (jobStatus.isComplete && jobStatus.result && this.onJobCompleted) {
        this.onJobCompleted(jobStatus.result);
      }
    } else {
      marker.visible = false;
      if (this.onJobUpdate) {
        this.onJobUpdate({
          canInteract: false,
          promptText: '',
          targetPos: null,
        });
      }
    }
  }

  public inspectBusPassenger(accept: boolean) {
    return this.jobSys.inspectPassengerTicket(accept);
  }

  public selectParcel(index: number) {
    this.jobSys.selectParcel(index);
  }

  private updateCamera(delta: number): void {
    if (!this.vehiclePhysics) return;

    const pos = this.vehiclePhysics.position;
    const heading = this.vehiclePhysics.rotationY;
    const speed = this.vehiclePhysics.speed;
    const dims = this.currentVehicleConfig.bodyDimensions;

    const forwardX = Math.sin(heading);
    const forwardZ = Math.cos(heading);

    switch (this.cameraMode) {
      case 'chase': {
        const chaseDist = dims.length * 1.8 + 4.2 + Math.min(3, Math.abs(speed) * 0.1);
        const chaseHeight = dims.height * 1.35 + 1.6;

        this.targetCameraPos.set(pos.x - forwardX * chaseDist, pos.y + chaseHeight, pos.z - forwardZ * chaseDist);
        this.targetCameraLook.set(pos.x + forwardX * 12, pos.y + 1.2, pos.z + forwardZ * 12);
        break;
      }
      case 'hood': {
        this.targetCameraPos.set(pos.x + forwardX * (dims.length * 0.3), pos.y + dims.height * 0.7, pos.z + forwardZ * (dims.length * 0.3));
        this.targetCameraLook.set(pos.x + forwardX * 25, pos.y + dims.height * 0.6, pos.z + forwardZ * 25);
        break;
      }
      case 'cabin': {
        this.targetCameraPos.set(pos.x - forwardX * 0.3, pos.y + dims.height * 0.85, pos.z - forwardZ * 0.3);
        this.targetCameraLook.set(pos.x + forwardX * 30, pos.y + dims.height * 0.8, pos.z + forwardZ * 30);
        break;
      }
    }

    // Smooth camera damping
    const lerpRate = Math.min(1, delta * 7.0);
    this.camera.position.lerp(this.targetCameraPos, lerpRate);

    const currentLook = new THREE.Vector3();
    this.camera.getWorldDirection(currentLook);
    this.camera.lookAt(this.targetCameraLook);
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private handleResize = (): void => {
    if (!this.canvas) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  public destroy(): void {
    this.pause();
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }
}
