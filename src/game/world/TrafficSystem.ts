import * as THREE from 'three';
import { ROAD_NETWORK, RoadSegment } from './DistrictData';
import { getWorldElevation } from './WorldElevation';
import { ProceduralRouteStreamer } from '../procedural/ProceduralRouteStreamer';
import { CollisionBox } from '../vehicle/VehiclePhysics';
import { getTerrainHeightAt } from './TerrainRaycaster';

export type TrafficCarType = 'sedan' | 'suv' | 'van' | 'taxi' | 'bus';

export interface TrafficCar {
  id: number;
  mesh: THREE.Group;
  wheels: THREE.Mesh[];
  type: TrafficCarType;
  // Streamer (Highway) mode state
  distance: number; // distance along procedural spline
  lane: number; // +1 = forward right lane, -1 = oncoming left lane
  laneOffset: number; // meters from spine centerline
  // City grid mode state
  segmentIndex: number;
  progress: number; // 0 to 1 along city road segment
  // Shared dynamics
  targetSpeed: number; // m/s
  currentSpeed: number; // m/s
  color: number;
  brakeLightMat: THREE.MeshStandardMaterial;
  headlightMat: THREE.MeshStandardMaterial;
  isSpawned: boolean;
  length: number;
  width: number;
}

export class TrafficSystem {
  public root: THREE.Group = new THREE.Group();
  private cars: TrafficCar[] = [];
  private density: 'low' | 'medium' | 'high' = 'medium';
  private targetCount = 8;
  private isStreamerMode = false;

  constructor() {}

  public init(count: number = 8): void {
    this.targetCount = count;
    // Clear any existing
    while (this.root.children.length > 0) {
      this.root.remove(this.root.children[0]);
    }
    this.cars = [];

    const carColors = [0xef4444, 0x3b82f6, 0x10b981, 0x64748b, 0x1e293b, 0xf8fafc, 0x8b5cf6, 0xd97706, 0x0284c7];
    const carTypes: TrafficCarType[] = ['sedan', 'suv', 'van', 'taxi', 'sedan', 'suv', 'bus', 'van'];

    for (let i = 0; i < count; i++) {
      const type = carTypes[i % carTypes.length];
      const color = type === 'taxi' ? 0xf59e0b : carColors[i % carColors.length];

      const { carGroup, wheels, brakeLightMat, headlightMat, length, width } = this.buildTrafficVehicle(type, color);

      carGroup.visible = false;
      this.root.add(carGroup);

      // Half forward lane, half oncoming lane
      const lane = i % 2 === 0 ? 1 : -1;
      const laneOffset = lane === 1 ? 2.2 : -2.2;

      this.cars.push({
        id: i,
        mesh: carGroup,
        wheels,
        type,
        distance: 60 + i * 35,
        lane,
        laneOffset,
        segmentIndex: i % ROAD_NETWORK.length,
        progress: (i / count) * 0.9,
        targetSpeed: 11 + (i % 4) * 2.2, // ~40-65 km/h
        currentSpeed: 12,
        color,
        brakeLightMat,
        headlightMat,
        isSpawned: false,
        length,
        width,
      });
    }
  }

  public setMode(isStreamer: boolean): void {
    if (this.isStreamerMode !== isStreamer) {
      this.isStreamerMode = isStreamer;
      // Reset car states
      this.cars.forEach((car, i) => {
        car.distance = 50 + i * 35;
        car.progress = (i / this.cars.length) * 0.9;
        car.currentSpeed = car.targetSpeed;
        car.isSpawned = false;
        car.mesh.visible = false;
      });
    }
  }

  private buildTrafficVehicle(
    type: TrafficCarType,
    colorHex: number
  ): {
    carGroup: THREE.Group;
    wheels: THREE.Mesh[];
    brakeLightMat: THREE.MeshStandardMaterial;
    headlightMat: THREE.MeshStandardMaterial;
    length: number;
    width: number;
  } {
    const carGroup = new THREE.Group();
    const wheels: THREE.Mesh[] = [];

    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.6, roughness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x111c2a, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.8 });
    const blackTrimMat = new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.8 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 });

    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff0c2,
      emissiveIntensity: 0.5,
    });

    const brakeLightMat = new THREE.MeshStandardMaterial({
      color: 0x660000,
      emissive: 0xff1111,
      emissiveIntensity: 0.35,
    });

    const createWheel = (radius: number, width: number): THREE.Mesh => {
      const wGeo = new THREE.CylinderGeometry(radius, radius, width, 16);
      wGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(wGeo, blackTrimMat);
      tire.castShadow = true;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, width + 0.02, 10), chromeMat);
      rim.rotateZ(Math.PI / 2);
      tire.add(rim);
      return tire;
    };

    let length = 4.4;
    let width = 1.82;

    if (type === 'bus') {
      length = 8.8;
      width = 2.4;
      const height = 2.8;

      const busBody = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.8, length), bodyMat);
      busBody.position.y = height * 0.48;
      busBody.castShadow = true;
      carGroup.add(busBody);

      const busWin = new THREE.Mesh(new THREE.BoxGeometry(width * 1.01, 1.0, length * 0.88), glassMat);
      busWin.position.set(0, height * 0.62, 0);
      carGroup.add(busWin);

      const fWin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.95, 1.2, 0.2), glassMat);
      fWin.position.set(0, height * 0.55, length * 0.5);
      carGroup.add(fWin);

      const lHL = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.22, 0.1), headlightMat);
      lHL.position.set(0, 0.6, length * 0.505);
      const lTL = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.3, 0.1), brakeLightMat);
      lTL.position.set(0, 0.8, -length * 0.505);
      carGroup.add(lHL, lTL);

      const wRadius = 0.5;
      const wWidth = 0.32;
      [
        [-width * 0.48, wRadius, length * 0.32],
        [width * 0.48, wRadius, length * 0.32],
        [-width * 0.48, wRadius, -length * 0.28],
        [width * 0.48, wRadius, -length * 0.28],
      ].forEach(([wx, wy, wz]) => {
        const wheel = createWheel(wRadius, wWidth);
        wheel.position.set(wx, wy, wz);
        carGroup.add(wheel);
        wheels.push(wheel);
      });
    } else if (type === 'sedan' || type === 'taxi') {
      const isTaxi = type === 'taxi';
      width = 1.82;
      length = 4.4;

      const lower = new THREE.Mesh(new THREE.BoxGeometry(width, 0.52, length * 0.94), bodyMat);
      lower.position.y = 0.55;
      lower.castShadow = true;
      carGroup.add(lower);

      const hood = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.12, 1.25), bodyMat);
      hood.position.set(0, 0.82, 1.15);
      hood.rotation.x = 0.08;
      carGroup.add(hood);

      const grille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.68, 0.22, 0.1), blackTrimMat);
      grille.position.set(0, 0.52, length * 0.48);
      carGroup.add(grille);

      const fBump = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.22, 0.2), blackTrimMat);
      fBump.position.set(0, 0.4, length * 0.48);
      const rBump = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.22, 0.2), blackTrimMat);
      rBump.position.set(0, 0.4, -length * 0.48);
      carGroup.add(fBump, rBump);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.55, 2.1), glassMat);
      cabin.position.set(0, 1.12, -0.2);
      carGroup.add(cabin);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 0.06, 1.95), bodyMat);
      roof.position.set(0, 1.4, -0.2);
      carGroup.add(roof);

      [-1, 1].forEach((s) => {
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.08), bodyMat);
        mirror.position.set(s * (width * 0.46), 0.95, 0.55);
        carGroup.add(mirror);
      });

      if (isTaxi) {
        const sign = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.16, 0.22), new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xfacc15,
          emissiveIntensity: 0.75,
        }));
        sign.position.set(0, 1.5, -0.2);
        carGroup.add(sign);
      }

      const lHL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.08), headlightMat);
      lHL.position.set(-width * 0.32, 0.65, length * 0.48);
      const rHL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.08), headlightMat);
      rHL.position.set(width * 0.32, 0.65, length * 0.48);
      carGroup.add(lHL, rHL);

      const lTL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.15, 0.08), brakeLightMat);
      lTL.position.set(-width * 0.32, 0.68, -length * 0.48);
      const rTL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.15, 0.08), brakeLightMat);
      rTL.position.set(width * 0.32, 0.68, -length * 0.48);
      carGroup.add(lTL, rTL);

      const wRadius = 0.34;
      const wWidth = 0.22;
      [
        [-width * 0.47, wRadius, 1.35],
        [width * 0.47, wRadius, 1.35],
        [-width * 0.47, wRadius, -1.35],
        [width * 0.47, wRadius, -1.35],
      ].forEach(([wx, wy, wz]) => {
        const wheel = createWheel(wRadius, wWidth);
        wheel.position.set(wx, wy, wz);
        carGroup.add(wheel);
        wheels.push(wheel);
      });
    } else if (type === 'suv') {
      width = 1.95;
      length = 4.6;

      const lower = new THREE.Mesh(new THREE.BoxGeometry(width, 0.65, length * 0.94), bodyMat);
      lower.position.y = 0.65;
      lower.castShadow = true;
      carGroup.add(lower);

      const hood = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 0.15, 1.4), bodyMat);
      hood.position.set(0, 0.98, 1.15);
      carGroup.add(hood);

      const grille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.32, 0.12), chromeMat);
      grille.position.set(0, 0.65, length * 0.48);
      carGroup.add(grille);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.68, 2.5), glassMat);
      cabin.position.set(0, 1.35, -0.3);
      carGroup.add(cabin);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.08, 2.4), bodyMat);
      roof.position.set(0, 1.7, -0.3);
      carGroup.add(roof);

      [-1, 1].forEach((s) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 2.1), chromeMat);
        rail.position.set(s * (width * 0.38), 1.76, -0.3);
        carGroup.add(rail);
      });

      const lHL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.1), headlightMat);
      lHL.position.set(-width * 0.34, 0.82, length * 0.48);
      const rHL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.1), headlightMat);
      rHL.position.set(width * 0.34, 0.82, length * 0.48);
      carGroup.add(lHL, rHL);

      const lTL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.1), brakeLightMat);
      lTL.position.set(-width * 0.36, 0.9, -length * 0.48);
      const rTL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.1), brakeLightMat);
      rTL.position.set(width * 0.36, 0.9, -length * 0.48);
      carGroup.add(lTL, rTL);

      const wRadius = 0.4;
      const wWidth = 0.26;
      [
        [-width * 0.48, wRadius, 1.4],
        [width * 0.48, wRadius, 1.4],
        [-width * 0.48, wRadius, -1.4],
        [width * 0.48, wRadius, -1.4],
      ].forEach(([wx, wy, wz]) => {
        const wheel = createWheel(wRadius, wWidth);
        wheel.position.set(wx, wy, wz);
        carGroup.add(wheel);
        wheels.push(wheel);
      });
    } else {
      // Van
      width = 1.95;
      length = 4.8;
      const height = 2.1;

      const cab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.8, 1.3), bodyMat);
      cab.position.set(0, 0.72, length * 0.34);
      carGroup.add(cab);

      const win = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.65, 0.1), glassMat);
      win.position.set(0, 1.35, length * 0.28);
      win.rotation.x = 0.32;
      carGroup.add(win);

      const cargo = new THREE.Mesh(new THREE.BoxGeometry(width * 1.01, height * 0.75, length * 0.68), bodyMat);
      cargo.position.set(0, height * 0.52, -length * 0.1);
      cargo.castShadow = true;
      carGroup.add(cargo);

      const bumper = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, 0.28, 0.25), blackTrimMat);
      bumper.position.set(0, 0.42, length * 0.46);
      carGroup.add(bumper);

      const lHL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.1), headlightMat);
      lHL.position.set(-width * 0.36, 0.75, length * 0.46);
      const rHL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.1), headlightMat);
      rHL.position.set(width * 0.36, 0.75, length * 0.46);
      carGroup.add(lHL, rHL);

      const lTL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.08), brakeLightMat);
      lTL.position.set(-width * 0.44, 1.15, -length * 0.45);
      const rTL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.08), brakeLightMat);
      rTL.position.set(width * 0.44, 1.15, -length * 0.45);
      carGroup.add(lTL, rTL);

      const wRadius = 0.38;
      const wWidth = 0.25;
      [
        [-width * 0.48, wRadius, 1.45],
        [width * 0.48, wRadius, 1.45],
        [-width * 0.48, wRadius, -1.35],
        [width * 0.48, wRadius, -1.35],
      ].forEach(([wx, wy, wz]) => {
        const wheel = createWheel(wRadius, wWidth);
        wheel.position.set(wx, wy, wz);
        carGroup.add(wheel);
        wheels.push(wheel);
      });
    }

    return { carGroup, wheels, brakeLightMat, headlightMat, length, width };
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    isNight: boolean,
    isEndlessMode: boolean = false,
    routeStreamer: ProceduralRouteStreamer | null = null,
    terrainColliders: THREE.Object3D[] = []
  ): void {
    const dt = Math.min(delta, 0.05);
    this.setMode(isEndlessMode && routeStreamer !== null);

    if (this.isStreamerMode && routeStreamer) {
      this.updateStreamerTraffic(dt, playerPos, isNight, routeStreamer, terrainColliders);
    } else {
      this.updateCityTraffic(dt, playerPos, isNight, terrainColliders);
    }
  }

  /**
   * Procedural Streamer Traffic AI (Active highway cruising in forward and oncoming lanes)
   */
  private updateStreamerTraffic(
    dt: number,
    playerPos: THREE.Vector3,
    isNight: boolean,
    streamer: ProceduralRouteStreamer,
    terrainColliders: THREE.Object3D[]
  ): void {
    const playerDist = Math.max(0, playerPos.z);
    const minActiveDist = playerDist - 90;
    const maxActiveDist = playerDist + 280;

    const colliders = terrainColliders.length > 0 ? terrainColliders : streamer.getTerrainColliders();

    this.cars.forEach((car, index) => {
      // 1. Check if car needs streaming recycling
      if (!car.isSpawned || car.distance < minActiveDist - 40 || car.distance > maxActiveDist + 60) {
        // Recycle car ahead or behind of player
        if (car.lane === 1) {
          // Forward traffic spawns ahead of player
          car.distance = playerDist + 45 + (index * 38) % 200;
        } else {
          // Oncoming traffic spawns far ahead driving towards player
          car.distance = playerDist + 110 + (index * 42) % 220;
        }
        car.currentSpeed = car.targetSpeed;
        car.isSpawned = true;
      }

      // 2. Advance car position along spline
      // Forward lane moves +s, oncoming lane moves -s
      const direction = car.lane === 1 ? 1 : -1;

      // Obstacle detection ahead in same lane
      let targetSpeed = car.targetSpeed;

      // Check distance to player
      const pt = streamer.evaluateSpine(car.distance);
      const posX = pt.x + pt.normal.x * car.laneOffset;
      const posZ = pt.z + pt.normal.z * car.laneOffset;
      const distToPlayer = Math.hypot(posX - playerPos.x, posZ - playerPos.z);

      // If player is stopped in our lane ahead of us, slow down
      const isPlayerInOurLane = Math.hypot(posX - playerPos.x, posZ - playerPos.z) < 16;
      const isPlayerAheadInLane = (playerPos.z - posZ) * direction > 0;
      if (isPlayerInOurLane && isPlayerAheadInLane && distToPlayer < 14) {
        targetSpeed = Math.max(0, targetSpeed * (distToPlayer / 14));
      }

      // Check distance to other NPC cars in same lane
      this.cars.forEach((otherCar) => {
        if (otherCar.id === car.id || otherCar.lane !== car.lane) return;
        const distDiff = (otherCar.distance - car.distance) * direction;
        if (distDiff > 0 && distDiff < 18) {
          targetSpeed = Math.min(targetSpeed, otherCar.currentSpeed * 0.85);
        }
      });

      // Smooth acceleration / deceleration
      car.currentSpeed += (targetSpeed - car.currentSpeed) * dt * 3.5;
      car.currentSpeed = Math.max(0, car.currentSpeed);

      // Advance distance
      car.distance += car.currentSpeed * dt * direction;

      // 3. Sample exact road surface elevation via raycasting down onto true mesh colliders
      const surfacePt = streamer.evaluateSpine(car.distance);
      const targetX = surfacePt.x + surfacePt.normal.x * car.laneOffset;
      const targetZ = surfacePt.z + surfacePt.normal.z * car.laneOffset;

      // Fresh Raycast Height: never default/guess
      const hitY = getTerrainHeightAt(targetX, targetZ, colliders);

      if (hitY !== null) {
        // Valid terrain/road mesh hit
        const posY = hitY + 0.08; // suspension clearance
        car.mesh.position.set(targetX, posY, targetZ);
        car.mesh.visible = true;

        // Align pitch along slope and heading along tangent
        const aheadDist = car.distance + 2.5 * direction;
        const ptAhead = streamer.evaluateSpine(aheadDist);
        const aheadX = ptAhead.x + ptAhead.normal.x * car.laneOffset;
        const aheadZ = ptAhead.z + ptAhead.normal.z * car.laneOffset;
        const hitYAhead = getTerrainHeightAt(aheadX, aheadZ, colliders) ?? (posY + (ptAhead.y - surfacePt.y));
        const pitch = -Math.atan2(hitYAhead - posY, 2.5) * direction;

        let heading = Math.atan2(surfacePt.tangent.x, surfacePt.tangent.z);
        if (car.lane === -1) {
          heading += Math.PI; // flip 180 for oncoming traffic
        }

        car.mesh.rotation.set(pitch, heading, surfacePt.banking * direction);
      } else {
        // Chunk not loaded at this distance yet — hide car instead of floating in mid-air
        car.mesh.visible = false;
      }

      // 4. Wheel rotation and lighting
      const wheelRotSpeed = car.currentSpeed / 0.35;
      car.wheels.forEach((w) => {
        w.rotation.x += wheelRotSpeed * dt;
      });

      const isBraking = car.currentSpeed < car.targetSpeed * 0.7;
      car.brakeLightMat.emissiveIntensity = isBraking ? 1.6 : 0.3;
      car.headlightMat.emissiveIntensity = isNight ? 1.5 : 0.4;
    });
  }

  /**
   * City Grid Traffic AI (Navigating Northbridge City road network)
   */
  private updateCityTraffic(
    dt: number,
    playerPos: THREE.Vector3,
    isNight: boolean,
    terrainColliders: THREE.Object3D[]
  ): void {
    this.cars.forEach((car) => {
      const seg: RoadSegment = ROAD_NETWORK[car.segmentIndex];
      if (!seg) return;

      const dx = seg.p2[0] - seg.p1[0];
      const dz = seg.p2[2] - seg.p1[2];
      const segLen = Math.hypot(dx, dz);

      const curX = seg.p1[0] + dx * car.progress;
      const curZ = seg.p1[2] + dz * car.progress;
      const angle = Math.atan2(dx, dz);

      const laneOffset = (seg.width / 4) * 0.8;
      const rightX = Math.cos(angle);
      const rightZ = -Math.sin(angle);

      const posX = curX + rightX * laneOffset;
      const posZ = curZ + rightZ * laneOffset;

      const distToPlayer = Math.hypot(posX - playerPos.x, posZ - playerPos.z);
      const isPlayerAhead = distToPlayer < 12 && Math.abs(Math.sin(angle) * (playerPos.x - posX) + Math.cos(angle) * (playerPos.z - posZ)) > 0;

      let targetSpeed = car.targetSpeed;
      if (distToPlayer < 10 && isPlayerAhead) {
        targetSpeed = 0;
      }

      car.currentSpeed += (targetSpeed - car.currentSpeed) * dt * 4;
      const moveDist = car.currentSpeed * dt;
      car.progress += moveDist / segLen;

      if (car.progress >= 1.0) {
        car.progress = 0;
        car.segmentIndex = (car.segmentIndex + 1) % ROAD_NETWORK.length;
      }

      // Height sampling with raycast or elevation
      const hitY = terrainColliders.length > 0 ? getTerrainHeightAt(posX, posZ, terrainColliders) : null;
      const posY = hitY !== null ? hitY + 0.08 : getWorldElevation(posX, posZ);

      car.mesh.position.set(posX, posY, posZ);
      car.mesh.visible = true;

      const yAhead = getWorldElevation(posX + Math.sin(angle) * 2, posZ + Math.cos(angle) * 2);
      const pitch = -Math.atan2(yAhead - posY, 2);
      car.mesh.rotation.set(pitch, angle, 0);

      const wheelRotSpeed = car.currentSpeed / 0.35;
      car.wheels.forEach((w) => {
        w.rotation.x += wheelRotSpeed * dt;
      });

      const isBraking = car.currentSpeed < car.targetSpeed * 0.7;
      car.brakeLightMat.emissiveIntensity = isBraking ? 1.6 : 0.3;
      car.headlightMat.emissiveIntensity = isNight ? 1.5 : 0.4;
    });
  }

  /**
   * Returns dynamic bounding collision boxes for all active, visible NPC traffic
   */
  public getCollisionBoxes(): CollisionBox[] {
    const boxes: CollisionBox[] = [];
    this.cars.forEach((car) => {
      if (!car.mesh.visible) return;
      const pos = car.mesh.position;
      const halfL = car.length * 0.5;
      const halfW = car.width * 0.5;

      boxes.push({
        minX: pos.x - halfW,
        maxX: pos.x + halfW,
        minZ: pos.z - halfL,
        maxZ: pos.z + halfL,
        label: `traffic_npc_${car.id}_${car.type}`,
      });
    });
    return boxes;
  }

  public setDensity(density: 'low' | 'medium' | 'high'): void {
    this.density = density;
    const count = density === 'low' ? 4 : density === 'medium' ? 8 : 14;
    this.init(count);
  }
}
