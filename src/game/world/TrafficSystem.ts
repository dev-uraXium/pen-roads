import * as THREE from 'three';
import { ROAD_NETWORK, RoadSegment } from './DistrictData';
import { getWorldElevation } from './WorldElevation';

export interface TrafficCar {
  mesh: THREE.Group;
  wheels: THREE.Mesh[];
  segmentIndex: number;
  progress: number; // 0 to 1 along segment
  speed: number; // target speed in m/s
  currentSpeed: number;
  color: number;
  brakeLightMat: THREE.MeshStandardMaterial;
  headlightMat: THREE.MeshStandardMaterial;
}

export type TrafficCarType = 'sedan' | 'suv' | 'van' | 'taxi';

export class TrafficSystem {
  public root: THREE.Group = new THREE.Group();
  private cars: TrafficCar[] = [];

  constructor() {}

  public init(count: number = 8): void {
    // Clear any existing
    while (this.root.children.length > 0) {
      this.root.remove(this.root.children[0]);
    }
    this.cars = [];

    const carColors = [0xef4444, 0x3b82f6, 0x10b981, 0x64748b, 0x1e293b, 0xf8fafc, 0x8b5cf6, 0xd97706];
    const carTypes: TrafficCarType[] = ['sedan', 'suv', 'van', 'taxi'];

    for (let i = 0; i < count; i++) {
      const segIndex = i % ROAD_NETWORK.length;
      const type = carTypes[i % carTypes.length];
      const color = type === 'taxi' ? 0xf59e0b : carColors[i % carColors.length];

      const { carGroup, wheels, brakeLightMat, headlightMat } = this.buildTrafficVehicle(type, color);

      this.root.add(carGroup);

      this.cars.push({
        mesh: carGroup,
        wheels,
        segmentIndex: segIndex,
        progress: (i / count) * 0.9,
        speed: 8 + (i % 4) * 2, // 30-50 km/h
        currentSpeed: 10,
        color,
        brakeLightMat,
        headlightMat,
      });
    }
  }

  private buildTrafficVehicle(
    type: TrafficCarType,
    colorHex: number
  ): { carGroup: THREE.Group; wheels: THREE.Mesh[]; brakeLightMat: THREE.MeshStandardMaterial; headlightMat: THREE.MeshStandardMaterial } {
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

    if (type === 'sedan' || type === 'taxi') {
      const isTaxi = type === 'taxi';
      const width = 1.82;
      const length = 4.4;

      // Lower Body
      const lower = new THREE.Mesh(new THREE.BoxGeometry(width, 0.52, length * 0.94), bodyMat);
      lower.position.y = 0.55;
      lower.castShadow = true;
      carGroup.add(lower);

      // Sloped Hood & Front Grille
      const hood = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.12, 1.25), bodyMat);
      hood.position.set(0, 0.82, 1.15);
      hood.rotation.x = 0.08;
      carGroup.add(hood);

      const grille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.68, 0.22, 0.1), blackTrimMat);
      grille.position.set(0, 0.52, length * 0.48);
      carGroup.add(grille);

      // Bumpers
      const fBump = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.22, 0.2), blackTrimMat);
      fBump.position.set(0, 0.4, length * 0.48);
      const rBump = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.22, 0.2), blackTrimMat);
      rBump.position.set(0, 0.4, -length * 0.48);
      carGroup.add(fBump, rBump);

      // Cabin & Windows
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.55, 2.1), glassMat);
      cabin.position.set(0, 1.12, -0.2);
      carGroup.add(cabin);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 0.06, 1.95), bodyMat);
      roof.position.set(0, 1.4, -0.2);
      carGroup.add(roof);

      // Side Mirrors
      [-1, 1].forEach((s) => {
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.08), bodyMat);
        mirror.position.set(s * (width * 0.46), 0.95, 0.55);
        carGroup.add(mirror);
      });

      // Taxi Roof Sign
      if (isTaxi) {
        const sign = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.16, 0.22), new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xfacc15,
          emissiveIntensity: 0.75,
        }));
        sign.position.set(0, 1.5, -0.2);
        carGroup.add(sign);
      }

      // Lights
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

      // Wheels
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
      const width = 1.95;
      const length = 4.6;

      // Heavy SUV Body
      const lower = new THREE.Mesh(new THREE.BoxGeometry(width, 0.65, length * 0.94), bodyMat);
      lower.position.y = 0.65;
      lower.castShadow = true;
      carGroup.add(lower);

      // Black lower cladding
      const trim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.02, 0.2, length * 0.95), blackTrimMat);
      trim.position.y = 0.35;
      carGroup.add(trim);

      // Chunky Hood & Grille
      const hood = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 0.15, 1.4), bodyMat);
      hood.position.set(0, 0.98, 1.15);
      carGroup.add(hood);

      const grille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.32, 0.12), chromeMat);
      grille.position.set(0, 0.65, length * 0.48);
      carGroup.add(grille);

      // Tall Cabin & Glass
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.68, 2.5), glassMat);
      cabin.position.set(0, 1.35, -0.3);
      carGroup.add(cabin);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.08, 2.4), bodyMat);
      roof.position.set(0, 1.7, -0.3);
      carGroup.add(roof);

      // Roof Rails
      [-1, 1].forEach((s) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 2.1), chromeMat);
        rail.position.set(s * (width * 0.38), 1.76, -0.3);
        carGroup.add(rail);
      });

      // Lights
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

      // Wheels
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
      // Commercial Van
      const width = 1.95;
      const length = 4.8;
      const height = 2.1;

      // Front cab
      const cab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.8, 1.3), bodyMat);
      cab.position.set(0, 0.72, length * 0.34);
      carGroup.add(cab);

      // Sloped windshield
      const win = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.65, 0.1), glassMat);
      win.position.set(0, 1.35, length * 0.28);
      win.rotation.x = 0.32;
      carGroup.add(win);

      // Cargo Body
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(width * 1.01, height * 0.75, length * 0.68), bodyMat);
      cargo.position.set(0, height * 0.52, -length * 0.1);
      cargo.castShadow = true;
      carGroup.add(cargo);

      // Bumpers & Grille
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, 0.28, 0.25), blackTrimMat);
      bumper.position.set(0, 0.42, length * 0.46);
      carGroup.add(bumper);

      const grille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, 0.26, 0.08), blackTrimMat);
      grille.position.set(0, 0.58, length * 0.48);
      carGroup.add(grille);

      // Lights
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

      // Wheels
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

    return { carGroup, wheels, brakeLightMat, headlightMat };
  }

  public update(delta: number, playerPos: THREE.Vector3, isNight: boolean): void {
    const dt = Math.min(delta, 0.05);

    this.cars.forEach((car) => {
      const seg: RoadSegment = ROAD_NETWORK[car.segmentIndex];
      const dx = seg.p2[0] - seg.p1[0];
      const dz = seg.p2[2] - seg.p1[2];
      const segLen = Math.hypot(dx, dz);

      // Current position along segment
      const curX = seg.p1[0] + dx * car.progress;
      const curZ = seg.p1[2] + dz * car.progress;
      const angle = Math.atan2(dx, dz);

      // Lane offset (drive on right side of road)
      const laneOffset = (seg.width / 4) * 0.8;
      const rightX = Math.cos(angle);
      const rightZ = -Math.sin(angle);

      const posX = curX + rightX * laneOffset;
      const posZ = curZ + rightZ * laneOffset;

      // Obstacle & player detection (stop if player or other car directly ahead)
      const distToPlayer = Math.hypot(posX - playerPos.x, posZ - playerPos.z);
      const isPlayerAhead = distToPlayer < 12 && Math.abs(Math.sin(angle) * (playerPos.x - posX) + Math.cos(angle) * (playerPos.z - posZ)) > 0;

      let targetSpeed = car.speed;
      if (distToPlayer < 10 && isPlayerAhead) {
        targetSpeed = 0; // stop for player
      }

      car.currentSpeed += (targetSpeed - car.currentSpeed) * dt * 4;

      // Update position
      const moveDist = car.currentSpeed * dt;
      car.progress += moveDist / segLen;

      // Rotate wheels with movement
      const wheelRotSpeed = car.currentSpeed / 0.35;
      car.wheels.forEach((w) => {
        w.rotation.x += wheelRotSpeed * dt;
      });

      if (car.progress >= 1.0) {
        car.progress = 0;
        car.segmentIndex = (car.segmentIndex + 1) % ROAD_NETWORK.length;
      }

      const posY = getWorldElevation(posX, posZ);
      car.mesh.position.set(posX, posY, posZ);

      // Pitch along slope
      const yAhead = getWorldElevation(posX + Math.sin(angle) * 2, posZ + Math.cos(angle) * 2);
      const pitch = -Math.atan2(yAhead - posY, 2);
      car.mesh.rotation.set(pitch, angle, 0);

      // Brake light intensity
      const isBraking = car.currentSpeed < car.speed * 0.7;
      car.brakeLightMat.emissiveIntensity = isBraking ? 1.6 : 0.3;

      // Night headlight glow
      car.headlightMat.emissiveIntensity = isNight ? 1.5 : 0.4;
    });
  }

  public setDensity(density: 'low' | 'medium' | 'high'): void {
    const count = density === 'low' ? 4 : density === 'medium' ? 8 : 14;
    this.init(count);
  }
}
