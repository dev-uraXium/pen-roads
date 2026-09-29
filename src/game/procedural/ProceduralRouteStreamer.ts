import * as THREE from 'three';
import { BiomeId, PointOfInterest, VehicleId } from '../../types/game';
import { CollisionBox } from '../vehicle/VehiclePhysics';
import { BIOME_CONFIGS } from '../world/BiomeConfigs';

export interface RoutePoint {
  x: number;
  y: number;
  z: number;
  tangent: THREE.Vector3;
  normal: THREE.Vector3; // points to right-hand side of road
  banking: number; // roll angle in radians
  distance: number;
  elevation: number;
}

export interface RouteSegment {
  index: number;
  group: THREE.Group;
  startDist: number;
  endDist: number;
  centerPos: THREE.Vector3;
  collisionBoxes: CollisionBox[];
  poi?: PointOfInterest;
}

export class ProceduralRouteStreamer {
  private scene: THREE.Scene;
  private biome: BiomeId;
  private seed: number;

  private segmentLength = 45; // meters per segment
  private roadWidth = 9.0; // 2 lanes + lane buffers
  private shoulderWidth = 2.4;
  private terrainMargin = 85.0; // width of terrain flanking each side

  private activeSegments: Map<number, RouteSegment> = new Map();
  private maxAheadSegments = 9; // ~405 meters ahead
  private maxBehindSegments = 4; // ~180 meters behind

  // Reusable materials
  private roadMat: THREE.MeshStandardMaterial;
  private centerLineMat: THREE.MeshBasicMaterial;
  private edgeLineMat: THREE.MeshBasicMaterial;
  private shoulderMat: THREE.MeshStandardMaterial;
  private terrainMat: THREE.MeshStandardMaterial;
  private rockMat: THREE.MeshStandardMaterial;
  private foliageMat: THREE.MeshStandardMaterial;
  private woodMat: THREE.MeshStandardMaterial;
  private steelMat: THREE.MeshStandardMaterial;
  private oceanWaterMesh: THREE.Mesh | null = null;

  // Cached POIs discovered
  public discoveredPOIs: PointOfInterest[] = [];
  public onPOINearby?: (poi: PointOfInterest | null) => void;
  private lastNotifiedPOIId: string | null = null;

  constructor(scene: THREE.Scene, biome: BiomeId = 'alpine_pass', seed: number = 42) {
    this.scene = scene;
    this.biome = biome;
    this.seed = seed;

    const bInfo = BIOME_CONFIGS[biome] || BIOME_CONFIGS.alpine_pass;

    // Materials
    this.roadMat = new THREE.MeshStandardMaterial({
      color: 0x22262d,
      roughness: 0.85,
      metalness: 0.1,
    });

    this.centerLineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b }); // amber yellow dashed
    this.edgeLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // crisp white solid edges

    this.shoulderMat = new THREE.MeshStandardMaterial({
      color: biome === 'coastal_highway' ? 0xd6c498 : biome === 'alpine_pass' ? 0x475569 : 0x5a4833,
      roughness: 0.95,
    });

    this.terrainMat = new THREE.MeshStandardMaterial({
      color: bInfo.groundBaseColor,
      roughness: 0.9,
      flatShading: true,
    });

    this.rockMat = new THREE.MeshStandardMaterial({
      color: bInfo.rockColor,
      roughness: 0.85,
      flatShading: true,
    });

    this.foliageMat = new THREE.MeshStandardMaterial({
      color: bInfo.foliageColor,
      roughness: 0.8,
      flatShading: true,
    });

    this.woodMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.8,
    });

    this.steelMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.65,
      roughness: 0.35,
    });

    // Coastal ocean water plane
    if (biome === 'coastal_highway') {
      const waterGeo = new THREE.PlaneGeometry(1600, 1600, 32, 32);
      waterGeo.rotateX(-Math.PI / 2);
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.15,
        metalness: 0.8,
        transparent: true,
        opacity: 0.85,
      });
      this.oceanWaterMesh = new THREE.Mesh(waterGeo, waterMat);
      this.oceanWaterMesh.position.set(160, -3.5, 0);
      this.scene.add(this.oceanWaterMesh);
    }
  }

  /**
   * Deterministic math function for route spine at distance s
   */
  public evaluateSpine(s: number): RoutePoint {
    const seedOffset = (this.seed % 1000) * 17.3;
    const t = (s + seedOffset) * 0.001;

    let x = 0;
    let y = 0;
    let z = s;
    let heading = 0;
    let banking = 0;

    switch (this.biome) {
      case 'alpine_pass': {
        // Dramatic sweeping mountain bends with steep switchbacks
        const cur1 = Math.sin(t * 1.8) * 45;
        const cur2 = Math.sin(t * 4.2 + 1.2) * 22;
        const cur3 = Math.cos(t * 0.6) * 60;
        x = cur1 + cur2 + cur3;

        // Mountain elevation profile
        const hill1 = Math.sin(t * 1.5) * 18;
        const hill2 = Math.cos(t * 3.1) * 8;
        y = Math.max(0, hill1 + hill2 + 10);

        // Banking into corners
        const dX = 1.8 * 0.001 * 45 * Math.cos(t * 1.8) + 4.2 * 0.001 * 22 * Math.cos(t * 4.2 + 1.2);
        banking = Math.max(-0.08, Math.min(0.08, -dX * 0.7));
        heading = Math.atan2(dX, 1);
        break;
      }

      case 'coastal_highway': {
        // Long, flowing scenic curves alongside ocean cliffs
        const cur1 = Math.sin(t * 1.2) * 55;
        const cur2 = Math.sin(t * 2.8) * 28;
        x = cur1 + cur2;

        // Coastal cliff elevation
        const hill1 = Math.sin(t * 1.1) * 7;
        const hill2 = Math.sin(t * 3.6) * 3;
        y = Math.max(2.5, 6.0 + hill1 + hill2);

        const dX = 1.2 * 0.001 * 55 * Math.cos(t * 1.2) + 2.8 * 0.001 * 28 * Math.cos(t * 2.8);
        banking = Math.max(-0.06, Math.min(0.06, -dX * 0.6));
        heading = Math.atan2(dX, 1);
        break;
      }

      case 'green_valley':
      default: {
        // Gentle rolling countryside meadows
        const cur1 = Math.sin(t * 1.4) * 35;
        const cur2 = Math.cos(t * 2.5) * 20;
        x = cur1 + cur2;

        // Low rolling knolls
        const hill1 = Math.sin(t * 2.0) * 4.5;
        const hill2 = Math.cos(t * 0.8) * 3.0;
        y = Math.max(0.5, 3.0 + hill1 + hill2);

        const dX = 1.4 * 0.001 * 35 * Math.cos(t * 1.4) - 2.5 * 0.001 * 20 * Math.sin(t * 2.5);
        banking = Math.max(-0.05, Math.min(0.05, -dX * 0.5));
        heading = Math.atan2(dX, 1);
        break;
      }
    }

    const tangent = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading)).normalize();
    const normal = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading)).normalize();

    return {
      x,
      y,
      z,
      tangent,
      normal,
      banking,
      distance: s,
      elevation: y,
    };
  }

  /**
   * Update active segments based on player position
   */
  public update(playerPos: THREE.Vector3): CollisionBox[] {
    // Keep ocean water mesh following player Z in coastal mode
    if (this.oceanWaterMesh) {
      this.oceanWaterMesh.position.z = playerPos.z;
    }

    // Estimate player's distance along the route
    const currentDist = Math.max(0, playerPos.z);
    const centerIdx = Math.floor(currentDist / this.segmentLength);

    const minIdx = Math.max(0, centerIdx - this.maxBehindSegments);
    const maxIdx = centerIdx + this.maxAheadSegments;

    // 1. Build missing segments ahead
    for (let idx = minIdx; idx <= maxIdx; idx++) {
      if (!this.activeSegments.has(idx)) {
        const seg = this.createSegment(idx);
        this.activeSegments.set(idx, seg);
        this.scene.add(seg.group);
      }
    }

    // 2. Dispose old segments behind player
    const toRemove: number[] = [];
    this.activeSegments.forEach((seg, idx) => {
      if (idx < minIdx || idx > maxIdx + 2) {
        toRemove.push(idx);
      }
    });

    toRemove.forEach((idx) => {
      const seg = this.activeSegments.get(idx);
      if (seg) {
        this.scene.remove(seg.group);
        // Dispose geometries
        seg.group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
          }
        });
        this.activeSegments.delete(idx);
      }
    });

    // 3. Collect active collision boxes
    const allBoxes: CollisionBox[] = [];
    this.activeSegments.forEach((seg) => {
      allBoxes.push(...seg.collisionBoxes);
    });

    // 4. Check for nearby POIs
    let nearbyPOI: PointOfInterest | null = null;
    this.activeSegments.forEach((seg) => {
      if (seg.poi) {
        const dx = playerPos.x - seg.poi.position[0];
        const dz = playerPos.z - seg.poi.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 35) {
          nearbyPOI = seg.poi;
        }
      }
    });

    if (nearbyPOI !== null) {
      if ((nearbyPOI as PointOfInterest).id !== this.lastNotifiedPOIId) {
        this.lastNotifiedPOIId = (nearbyPOI as PointOfInterest).id;
        this.onPOINearby?.(nearbyPOI);
      }
    } else if (this.lastNotifiedPOIId !== null) {
      this.lastNotifiedPOIId = null;
      this.onPOINearby?.(null);
    }

    return allBoxes;
  }

  /**
   * Constructs a single road segment with road surface, markings, shoulders, terrain, and props
   */
  private createSegment(idx: number): RouteSegment {
    const group = new THREE.Group();
    const collisionBoxes: CollisionBox[] = [];
    const startDist = idx * this.segmentLength;
    const endDist = (idx + 1) * this.segmentLength;

    const steps = 8; // longitudinal slices
    const stepDist = this.segmentLength / steps;

    // Collect spine points along this segment
    const points: RoutePoint[] = [];
    for (let i = 0; i <= steps; i++) {
      points.push(this.evaluateSpine(startDist + i * stepDist));
    }

    const midPoint = points[Math.floor(steps / 2)];
    const centerPos = new THREE.Vector3(midPoint.x, midPoint.y, midPoint.z);

    // ==========================================
    // 1. ROAD SURFACE & EXTRUDED DECK SKIRTS
    // ==========================================
    const roadGeo = new THREE.BufferGeometry();
    const roadVerts: number[] = [];
    const roadNorms: number[] = [];
    const roadIndices: number[] = [];

    const halfW = this.roadWidth * 0.5;
    const skirtDepth = 0.8;

    for (let i = 0; i <= steps; i++) {
      const p = points[i];
      const norm = p.normal;
      const bank = p.banking;

      // Left and right surface edge
      const lx = p.x - norm.x * halfW;
      const lz = p.z - norm.z * halfW;
      const ly = p.y - halfW * Math.tan(bank);

      const rx = p.x + norm.x * halfW;
      const rz = p.z + norm.z * halfW;
      const ry = p.y + halfW * Math.tan(bank);

      // 4 vertices per slice: [0: TopLeft, 1: TopRight, 2: SkirtLeft, 3: SkirtRight]
      roadVerts.push(lx, ly, lz);
      roadVerts.push(rx, ry, rz);
      roadVerts.push(lx, ly - skirtDepth, lz);
      roadVerts.push(rx, ry - skirtDepth, rz);

      roadNorms.push(0, 1, 0);
      roadNorms.push(0, 1, 0);
      roadNorms.push(-norm.x, 0, -norm.z);
      roadNorms.push(norm.x, 0, norm.z);

      if (i < steps) {
        const row = i * 4;
        const next = (i + 1) * 4;

        // Top road surface quad
        roadIndices.push(row, row + 1, next);
        roadIndices.push(row + 1, next + 1, next);

        // Left side skirt quad
        roadIndices.push(row + 2, row, next + 2);
        roadIndices.push(row, next, next + 2);

        // Right side skirt quad
        roadIndices.push(row + 1, row + 3, next + 1);
        roadIndices.push(row + 3, next + 3, next + 1);
      }
    }

    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVerts, 3));
    roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNorms, 3));
    roadGeo.setIndex(roadIndices);
    const roadMesh = new THREE.Mesh(roadGeo, this.roadMat);
    roadMesh.receiveShadow = true;
    group.add(roadMesh);

    // ==========================================
    // 2. CENTER DASHED STRIPE & SOLID EDGES
    // ==========================================
    const centerStripeGeo = new THREE.BufferGeometry();
    const centerVerts: number[] = [];
    const centerIndices: number[] = [];
    const cWidth = 0.22;

    for (let i = 0; i <= steps; i++) {
      const p = points[i];
      const norm = p.normal;
      const bank = p.banking;
      const centerY = p.y + 0.02;

      centerVerts.push(p.x - norm.x * (cWidth * 0.5), centerY - (cWidth * 0.5) * Math.tan(bank), p.z - norm.z * (cWidth * 0.5));
      centerVerts.push(p.x + norm.x * (cWidth * 0.5), centerY + (cWidth * 0.5) * Math.tan(bank), p.z + norm.z * (cWidth * 0.5));

      if (i < steps && (idx * steps + i) % 2 === 0) {
        const row = i * 2;
        centerIndices.push(row, row + 1, row + 2);
        centerIndices.push(row + 1, row + 3, row + 2);
      }
    }
    centerStripeGeo.setAttribute('position', new THREE.Float32BufferAttribute(centerVerts, 3));
    centerStripeGeo.setIndex(centerIndices);
    const centerStripeMesh = new THREE.Mesh(centerStripeGeo, this.centerLineMat);
    group.add(centerStripeMesh);

    // Outer Edge Lines (White)
    [-1, 1].forEach((side) => {
      const edgeGeo = new THREE.BufferGeometry();
      const edgeVerts: number[] = [];
      const edgeIndices: number[] = [];
      const eOffset = halfW - 0.35;
      const eW = 0.16;

      for (let i = 0; i <= steps; i++) {
        const p = points[i];
        const norm = p.normal;
        const bank = p.banking;
        const cx = p.x + norm.x * (side * eOffset);
        const cz = p.z + norm.z * (side * eOffset);
        const cy = p.y + (side * eOffset) * Math.tan(bank) + 0.02;

        edgeVerts.push(cx - norm.x * (eW * 0.5), cy, cz - norm.z * (eW * 0.5));
        edgeVerts.push(cx + norm.x * (eW * 0.5), cy, cz + norm.z * (eW * 0.5));

        if (i < steps) {
          const row = i * 2;
          edgeIndices.push(row, row + 1, row + 2);
          edgeIndices.push(row + 1, row + 3, row + 2);
        }
      }
      edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgeVerts, 3));
      edgeGeo.setIndex(edgeIndices);
      const edgeMesh = new THREE.Mesh(edgeGeo, this.edgeLineMat);
      group.add(edgeMesh);
    });

    // ==========================================
    // 3. ROAD SHOULDERS (Gravel / Packed Earth with Skirts)
    // ==========================================
    const shoulderGeo = new THREE.BufferGeometry();
    const sVerts: number[] = [];
    const sIndices: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const p = points[i];
      const norm = p.normal;
      const bank = p.banking;

      // Left road edge & outer shoulder
      const lInnerX = p.x - norm.x * halfW;
      const lInnerZ = p.z - norm.z * halfW;
      const lInnerY = p.y - halfW * Math.tan(bank);

      const lOuterX = p.x - norm.x * (halfW + this.shoulderWidth);
      const lOuterZ = p.z - norm.z * (halfW + this.shoulderWidth);
      const lOuterY = lInnerY - 0.08;

      // Right road edge & outer shoulder
      const rInnerX = p.x + norm.x * halfW;
      const rInnerZ = p.z + norm.z * halfW;
      const rInnerY = p.y + halfW * Math.tan(bank);

      const rOuterX = p.x + norm.x * (halfW + this.shoulderWidth);
      const rOuterZ = p.z + norm.z * (halfW + this.shoulderWidth);
      const rOuterY = rInnerY - 0.08;

      // 6 vertices per slice: [0: lOuter, 1: lInner, 2: rInner, 3: rOuter, 4: lSkirt, 5: rSkirt]
      sVerts.push(lOuterX, lOuterY, lOuterZ);
      sVerts.push(lInnerX, lInnerY, lInnerZ);
      sVerts.push(rInnerX, rInnerY, rInnerZ);
      sVerts.push(rOuterX, rOuterY, rOuterZ);
      sVerts.push(lOuterX, lOuterY - 1.2, lOuterZ);
      sVerts.push(rOuterX, rOuterY - 1.2, rOuterZ);

      if (i < steps) {
        const row = i * 6;
        const next = (i + 1) * 6;

        // Left shoulder quad
        sIndices.push(row, row + 1, next);
        sIndices.push(row + 1, next + 1, next);

        // Right shoulder quad
        sIndices.push(row + 2, row + 3, next + 2);
        sIndices.push(row + 3, next + 3, next + 2);

        // Left outer skirt
        sIndices.push(row + 4, row, next + 4);
        sIndices.push(row, next, next + 4);

        // Right outer skirt
        sIndices.push(row + 3, row + 5, next + 3);
        sIndices.push(row + 5, next + 5, next + 3);
      }
    }
    shoulderGeo.setAttribute('position', new THREE.Float32BufferAttribute(sVerts, 3));
    shoulderGeo.computeVertexNormals();
    shoulderGeo.setIndex(sIndices);
    const shoulderMesh = new THREE.Mesh(shoulderGeo, this.shoulderMat);
    shoulderMesh.receiveShadow = true;
    group.add(shoulderMesh);

    // ==========================================
    // 4. PROCEDURAL FLANKING TERRAIN (Seamless + Skirts)
    // ==========================================
    const terrainGeo = new THREE.BufferGeometry();
    const tVerts: number[] = [];
    const tIndices: number[] = [];

    const terrainSlices = 4;
    const sliceWidth = this.terrainMargin / terrainSlices;

    for (let i = 0; i <= steps; i++) {
      const p = points[i];
      const norm = p.normal;
      const bank = p.banking;
      const rowStart = tVerts.length / 3;

      const lShoulderY = p.y - halfW * Math.tan(bank) - 0.08;
      const rShoulderY = p.y + halfW * Math.tan(bank) - 0.08;

      // Left Flank (from far left to shoulder)
      for (let s = terrainSlices; s >= 0; s--) {
        const distFromRoad = halfW + this.shoulderWidth + s * sliceWidth;
        const tx = p.x - norm.x * distFromRoad;
        const tz = p.z - norm.z * distFromRoad;

        let ty = lShoulderY;
        if (s > 0) {
          const sRatio = s / terrainSlices;
          if (this.biome === 'alpine_pass') {
            const crags = Math.sin(tx * 0.05 + tz * 0.04) * 7 + Math.cos(tx * 0.02 + tz * 0.03) * 4;
            ty = p.y + crags + sRatio * 22;
          } else if (this.biome === 'coastal_highway') {
            ty = p.y + sRatio * 14 + Math.sin(tx * 0.08) * 3;
          } else {
            const knolls = Math.sin(tx * 0.04 + tz * 0.03) * 4;
            ty = p.y + knolls + sRatio * 6;
          }
        }

        tVerts.push(tx, ty, tz);
      }

      // Right Flank (from shoulder to far right)
      for (let s = 0; s <= terrainSlices; s++) {
        const distFromRoad = halfW + this.shoulderWidth + s * sliceWidth;
        const tx = p.x + norm.x * distFromRoad;
        const tz = p.z + norm.z * distFromRoad;

        let ty = rShoulderY;
        if (s > 0) {
          const sRatio = s / terrainSlices;
          if (this.biome === 'coastal_highway') {
            ty = Math.max(-2.5, p.y - sRatio * (p.y + 2.5));
          } else if (this.biome === 'alpine_pass') {
            const crags = Math.cos(tx * 0.06 + tz * 0.05) * 6 + Math.sin(tx * 0.03 - tz * 0.02) * 3;
            ty = p.y + crags + sRatio * 18;
          } else {
            const knolls = Math.cos(tx * 0.04 + tz * 0.03) * 4;
            ty = p.y + knolls + sRatio * 5;
          }
        }

        tVerts.push(tx, ty, tz);
      }

      if (i < steps) {
        const totalCols = (terrainSlices + 1) * 2;
        for (let c = 0; c < totalCols - 1; c++) {
          if (c === terrainSlices) continue; // skip road gap
          const p1 = rowStart + c;
          const p2 = rowStart + c + 1;
          const p3 = rowStart + totalCols + c;
          const p4 = rowStart + totalCols + c + 1;

          tIndices.push(p1, p3, p2);
          tIndices.push(p2, p3, p4);
        }
      }
    }

    terrainGeo.setAttribute('position', new THREE.Float32BufferAttribute(tVerts, 3));
    terrainGeo.computeVertexNormals();
    terrainGeo.setIndex(tIndices);
    const terrainMesh = new THREE.Mesh(terrainGeo, this.terrainMat);
    terrainMesh.receiveShadow = true;
    group.add(terrainMesh);

    // ==========================================
    // 5. GUARDRAILS (On curves or cliffs)
    // ==========================================
    const isCurved = Math.abs(midPoint.banking) > 0.02 || this.biome === 'alpine_pass';
    if (isCurved) {
      const guardSide = midPoint.banking < 0 ? 1 : -1; // outside of the bend
      const guardDist = halfW + 0.6;
      for (let i = 0; i <= steps; i += 2) {
        const p = points[i];
        const norm = p.normal;
        const gx = p.x + norm.x * (guardSide * guardDist);
        const gz = p.z + norm.z * (guardSide * guardDist);
        const gy = p.y;

        // Post
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.95, 6), this.steelMat);
        post.position.set(gx, gy + 0.45, gz);
        group.add(post);

        // Armco horizontal rail
        if (i < steps) {
          const nextP = points[Math.min(steps, i + 2)];
          const nGx = nextP.x + nextP.normal.x * (guardSide * guardDist);
          const nGz = nextP.z + nextP.normal.z * (guardSide * guardDist);
          const nGy = nextP.y;

          const dx = nGx - gx;
          const dz = nGz - gz;
          const len = Math.sqrt(dx * dx + dz * dz);

          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, len), this.steelMat);
          rail.position.set((gx + nGx) * 0.5, (gy + nGy) * 0.5 + 0.65, (gz + nGz) * 0.5);
          rail.rotation.y = Math.atan2(dx, dz);
          group.add(rail);

          collisionBoxes.push({
            minX: Math.min(gx, nGx) - 0.4,
            maxX: Math.max(gx, nGx) + 0.4,
            minZ: Math.min(gz, nGz) - 0.4,
            maxZ: Math.max(gz, nGz) + 0.4,
            label: 'Guardrail',
          });
        }
      }
    }

    // ==========================================
    // 6. ROADSIDE PROPS & LANDMARKS
    // ==========================================
    let createdPOI: PointOfInterest | undefined;

    // A. Major Biome Landmarks every ~8-12 segments (~360-540m)
    if (idx > 0 && idx % 9 === 0) {
      createdPOI = this.buildLandmarkForBiome(idx, midPoint, group, collisionBoxes);
      if (createdPOI) {
        this.discoveredPOIs.push(createdPOI);
      }
    }

    // B. Contextual Biome Trees & Boulders
    this.populateFoliageAndRocks(idx, points, group, collisionBoxes);

    return {
      index: idx,
      group,
      startDist,
      endDist,
      centerPos,
      collisionBoxes,
      poi: createdPOI,
    };
  }

  /**
   * Biome-specific landmark construction (Bridges, Cabins, Lighthouses, Barns, Rest Stops)
   */
  private buildLandmarkForBiome(
    idx: number,
    point: RoutePoint,
    group: THREE.Group,
    boxes: CollisionBox[]
  ): PointOfInterest | undefined {
    const norm = point.normal;

    switch (this.biome) {
      case 'alpine_pass': {
        const landmarkType = idx % 18 === 0 ? 'bridge' : 'cabin';

        if (landmarkType === 'bridge') {
          // Canyon Steel Warren Truss Bridge
          const bridgeLen = 42;
          const bridgeGroup = new THREE.Group();
          bridgeGroup.position.set(point.x, point.y, point.z);
          bridgeGroup.rotation.y = Math.atan2(point.tangent.x, point.tangent.z);

          // Towering steel Warren trusses with diagonal cross-braces
          [-1, 1].forEach((side) => {
            const sideX = side * 5.4;
            const bottomChrd = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, bridgeLen), this.steelMat);
            bottomChrd.position.set(sideX, 0.25, 0);
            const topChrd = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, bridgeLen), this.steelMat);
            topChrd.position.set(sideX, 4.6, 0);
            bridgeGroup.add(bottomChrd, topChrd);

            // Diagonal web braces
            for (let b = -bridgeLen / 2 + 3; b <= bridgeLen / 2 - 3; b += 6) {
              const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.2, 0.25), this.steelMat);
              post.position.set(sideX, 2.4, b);
              const diag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5.2, 0.2), this.steelMat);
              diag.position.set(sideX, 2.4, b + 3);
              diag.rotation.x = 0.65;
              bridgeGroup.add(post, diag);
            }
          });

          // Overhead clearance cross-girders
          for (let g = -bridgeLen / 2 + 4; g <= bridgeLen / 2 - 4; g += 8) {
            const girder = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.35, 0.35), this.steelMat);
            girder.position.set(0, 4.6, g);
            bridgeGroup.add(girder);
          }

          group.add(bridgeGroup);
          boxes.push({
            minX: point.x - 6,
            maxX: point.x + 6,
            minZ: point.z - 21,
            maxZ: point.z + 21,
            label: 'Alpine Canyon Bridge',
          });

          return {
            id: `alpine_bridge_${idx}`,
            name: 'High Gorge Steel Bridge',
            type: 'bridge',
            position: [point.x, point.y, point.z],
            rotationY: Math.atan2(point.tangent.x, point.tangent.z),
            description: 'Dramatic steel truss span suspended high above an alpine river chasm.',
          };
        } else {
          // Timber Cabin Rest Stop with stone chimney & covered porch
          const cabinSide = -1;
          const cabinX = point.x + norm.x * (cabinSide * 16);
          const cabinZ = point.z + norm.z * (cabinSide * 16);
          const cabinY = point.y + 0.2;

          const cabinGroup = new THREE.Group();
          cabinGroup.position.set(cabinX, cabinY, cabinZ);
          cabinGroup.rotation.y = Math.atan2(point.tangent.x, point.tangent.z) + Math.PI / 2;

          // Stone base
          const stoneBase = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.8, 10.5), new THREE.MeshStandardMaterial({ color: 0x475569 }));
          stoneBase.position.y = 0.4;
          cabinGroup.add(stoneBase);

          // Main log body
          const cabinBody = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 10), this.woodMat);
          cabinBody.position.y = 3.05;
          cabinGroup.add(cabinBody);

          // Steep A-frame roof with shingles
          const roof = new THREE.Mesh(new THREE.ConeGeometry(7.2, 4.0, 4), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 }));
          roof.position.y = 7.1;
          roof.rotation.y = Math.PI / 4;
          cabinGroup.add(roof);

          // Stone Chimney with smoke top
          const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6.2, 1.4), new THREE.MeshStandardMaterial({ color: 0x57534e }));
          chimney.position.set(3.2, 5.2, 2.5);
          cabinGroup.add(chimney);

          // Front Covered Porch
          const porch = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 3), this.woodMat);
          porch.position.set(0, 0.9, 6.2);
          const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.2, 3.2), new THREE.MeshStandardMaterial({ color: 0x334155 }));
          porchRoof.position.set(0, 3.8, 6.2);
          porchRoof.rotation.x = 0.15;
          cabinGroup.add(porch, porchRoof);

          // Warm illuminated windows
          const winMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.75 });
          const win1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.1), winMat);
          win1.position.set(-2, 3.2, 5.05);
          const win2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.1), winMat);
          win2.position.set(2, 3.2, 5.05);
          cabinGroup.add(win1, win2);

          // Pull-off parking bay asphalt
          const bayMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
          const bay = new THREE.Mesh(new THREE.BoxGeometry(16, 0.15, 20), bayMat);
          bay.position.set(cabinSide * 5, -0.05, 0);
          cabinGroup.add(bay);

          group.add(cabinGroup);

          boxes.push({
            minX: cabinX - 6,
            maxX: cabinX + 6,
            minZ: cabinZ - 7,
            maxZ: cabinZ + 7,
            label: 'Timber Alpine Lodge',
          });

          return {
            id: `alpine_rest_${idx}`,
            name: 'Timberline Alpine Lodge',
            type: 'rest_stop',
            position: [cabinX, cabinY, cabinZ],
            rotationY: Math.atan2(point.tangent.x, point.tangent.z),
            description: 'Cozy mountain rest lodge with coffee, timber fireplace, and panoramic ridge views.',
            hasJobOpportunity: true,
          };
        }
      }

      case 'coastal_highway': {
        const landmarkType = idx % 18 === 0 ? 'lighthouse' : 'viewpoint';

        if (landmarkType === 'lighthouse') {
          // Cape North Lighthouse with Keeper's Cottage
          const lhX = point.x + norm.x * 24;
          const lhZ = point.z + norm.z * 24;
          const lhY = point.y + 1.2;

          const lhGroup = new THREE.Group();
          lhGroup.position.set(lhX, lhY, lhZ);

          // Stone Foundation Platform
          const found = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.0, 2.0, 16), new THREE.MeshStandardMaterial({ color: 0x475569 }));
          found.position.y = 1.0;
          lhGroup.add(found);

          // White Conical Lighthouse Tower with Red Band
          const tower = new THREE.Mesh(
            new THREE.CylinderGeometry(2.2, 3.8, 18, 20),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 })
          );
          tower.position.y = 11.0;
          lhGroup.add(tower);

          const redStripe = new THREE.Mesh(
            new THREE.CylinderGeometry(2.8, 3.2, 4.5, 20),
            new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 })
          );
          redStripe.position.y = 11.0;
          lhGroup.add(redStripe);

          // Balcony Observation Gallery & Railing
          const gallery = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.4, 20), new THREE.MeshStandardMaterial({ color: 0x334155 }));
          gallery.position.y = 20.2;
          const railing = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.9, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x1e293b, wireframe: true }));
          railing.position.y = 20.7;
          lhGroup.add(gallery, railing);

          // Lantern Room & Rotating Lens
          const lantern = new THREE.Mesh(
            new THREE.CylinderGeometry(2.4, 2.4, 3.0, 16),
            new THREE.MeshStandardMaterial({ color: 0xdc2626 })
          );
          lantern.position.y = 21.8;
          const lens = new THREE.Mesh(
            new THREE.SphereGeometry(1.6, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfef08a, emissiveIntensity: 1.5 })
          );
          lens.position.y = 21.8;
          const domeCap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.8, 16), new THREE.MeshStandardMaterial({ color: 0x991b1b }));
          domeCap.position.y = 24.2;
          lhGroup.add(lantern, lens, domeCap);

          // Lighthouse Keeper's Cottage
          const cottage = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 6), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
          cottage.position.set(-6.5, 3.25, 0);
          const cotRoof = new THREE.Mesh(new THREE.ConeGeometry(6.5, 2.8, 4), new THREE.MeshStandardMaterial({ color: 0x991b1b }));
          cotRoof.position.set(-6.5, 6.8, 0);
          cotRoof.rotation.y = Math.PI / 4;
          lhGroup.add(cottage, cotRoof);

          group.add(lhGroup);

          boxes.push({
            minX: lhX - 9,
            maxX: lhX + 6,
            minZ: lhZ - 6,
            maxZ: lhZ + 6,
            label: 'Cape Lighthouse',
          });

          return {
            id: `coastal_lh_${idx}`,
            name: 'Cape Solitude Lighthouse',
            type: 'viewpoint',
            position: [lhX, lhY, lhZ],
            rotationY: Math.atan2(point.tangent.x, point.tangent.z),
            description: 'Historic seaside beacon guarding rocky headlands with sweeping ocean horizons.',
            hasJobOpportunity: true,
          };
        } else {
          // Seaside Boardwalk Rest Stop & Viewpoint
          const vpX = point.x + norm.x * 14;
          const vpZ = point.z + norm.z * 14;
          const vpY = point.y + 0.1;

          const vpGroup = new THREE.Group();
          vpGroup.position.set(vpX, vpY, vpZ);

          const deck = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 14), this.woodMat);
          deck.position.y = 0.15;
          vpGroup.add(deck);

          const deckRail = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.9, 0.15), this.woodMat);
          deckRail.position.set(0, 0.6, 6.9);
          vpGroup.add(deckRail);

          const scope = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.18, 1.3, 8),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 })
          );
          scope.position.set(0, 0.8, 5.5);
          vpGroup.add(scope);

          group.add(vpGroup);

          return {
            id: `coastal_vp_${idx}`,
            name: 'Ocean Bluff Overlook',
            type: 'viewpoint',
            position: [vpX, vpY, vpZ],
            rotationY: Math.atan2(point.tangent.x, point.tangent.z),
            description: 'Panoramic coastal lookout featuring sea vistas, crashing waves, and offshore seabirds.',
          };
        }
      }

      case 'green_valley':
      default: {
        const landmarkType = idx % 18 === 0 ? 'barn' : 'shelter';

        if (landmarkType === 'barn') {
          // Heritage Red Barn & Silo with Cross-Braced Doors & Weathercock
          const barnX = point.x + norm.x * -18;
          const barnZ = point.z + norm.z * -18;
          const barnY = point.y + 0.1;

          const barnGroup = new THREE.Group();
          barnGroup.position.set(barnX, barnY, barnZ);
          barnGroup.rotation.y = Math.atan2(point.tangent.x, point.tangent.z) + Math.PI / 2;

          const barnBody = new THREE.Mesh(
            new THREE.BoxGeometry(11, 6.5, 15),
            new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.75 })
          );
          barnBody.position.y = 3.25;
          barnGroup.add(barnBody);

          // White Cross-Braced Double Barn Doors
          const door = new THREE.Mesh(new THREE.BoxGeometry(4.5, 4.2, 0.2), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
          door.position.set(0, 2.1, 7.55);
          const xBrace1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.2, 0.25), new THREE.MeshStandardMaterial({ color: 0x991b1b }));
          xBrace1.rotation.z = 0.65;
          xBrace1.position.set(0, 2.1, 7.58);
          barnGroup.add(door, xBrace1);

          // Gambrel Roof with Cupola & Weathercock
          const roof = new THREE.Mesh(
            new THREE.ConeGeometry(9.5, 4.8, 4),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
          );
          roof.position.y = 8.8;
          roof.rotation.y = Math.PI / 4;
          barnGroup.add(roof);

          const cupola = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.6), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
          cupola.position.y = 11.5;
          const weathercock = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), this.steelMat);
          weathercock.position.y = 12.8;
          barnGroup.add(cupola, weathercock);

          // Corrugated Grain Silo with Domed Roof
          const silo = new THREE.Mesh(
            new THREE.CylinderGeometry(2.6, 2.6, 13, 20),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 })
          );
          silo.position.set(8.2, 6.5, 0);
          const siloDome = new THREE.Mesh(
            new THREE.SphereGeometry(2.7, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 })
          );
          siloDome.position.set(8.2, 13.0, 0);
          barnGroup.add(silo, siloDome);

          group.add(barnGroup);

          boxes.push({
            minX: barnX - 8,
            maxX: barnX + 8,
            minZ: barnZ - 9,
            maxZ: barnZ + 9,
            label: 'Meadow Heritage Barn',
          });

          return {
            id: `valley_barn_${idx}`,
            name: 'Sunfield Heritage Barn & Depot',
            type: 'depot',
            position: [barnX, barnY, barnZ],
            rotationY: Math.atan2(point.tangent.x, point.tangent.z),
            description: 'Rustic family farmstead with fresh harvest produce, livestock pastures, and cargo pickups.',
            hasJobOpportunity: true,
          };
        } else {
          // Village Timber Bus Shelter with Schedule Sign
          const shX = point.x + norm.x * 7.5;
          const shZ = point.z + norm.z * 7.5;
          const shY = point.y + 0.1;

          const shGroup = new THREE.Group();
          shGroup.position.set(shX, shY, shZ);
          shGroup.rotation.y = Math.atan2(point.tangent.x, point.tangent.z) - Math.PI / 2;

          const shelter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.8, 2.4), this.woodMat);
          shelter.position.y = 1.4;
          shGroup.add(shelter);

          const bench = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.45, 0.6), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
          bench.position.set(0, 0.45, 0.4);
          shGroup.add(bench);

          group.add(shGroup);

          boxes.push({
            minX: shX - 2.5,
            maxX: shX + 2.5,
            minZ: shZ - 2.5,
            maxZ: shZ + 2.5,
            label: 'Village Waypoint Shelter',
          });

          return {
            id: `valley_shelter_${idx}`,
            name: 'Valley Waypoint Shelter',
            type: 'shelter',
            position: [shX, shY, shZ],
            rotationY: Math.atan2(point.tangent.x, point.tangent.z),
            description: 'Charming roadside wooden transit shelter for local commuters and passenger pickups.',
            hasJobOpportunity: true,
          };
        }
      }
    }
  }

  /**
   * Spawns trees, shrubs, and rock formations contextually along the roadside
   */
  private populateFoliageAndRocks(
    idx: number,
    points: RoutePoint[],
    group: THREE.Group,
    boxes: CollisionBox[]
  ): void {
    const halfW = this.roadWidth * 0.5 + this.shoulderWidth;

    // Place 3-5 props per segment
    const count = 4;
    for (let i = 0; i < count; i++) {
      const pIdx = Math.floor((i / count) * (points.length - 1));
      const p = points[pIdx];
      const norm = p.normal;
      const side = (idx * 7 + i) % 2 === 0 ? 1 : -1;

      // Distance away from road: safe margin so trees never block driving lane
      const offsetDist = halfW + 3.5 + ((idx * 13 + i * 29) % 35);
      const px = p.x + norm.x * (side * offsetDist);
      const pz = p.z + norm.z * (side * offsetDist);
      const py = p.y;

      const isRock = (idx + i) % 3 === 0;

      if (isRock) {
        // Rock formation
        const rScale = 1.2 + ((idx * 5 + i * 11) % 15) * 0.15;
        const rockGeo = new THREE.DodecahedronGeometry(rScale, 1);
        const rockMesh = new THREE.Mesh(rockGeo, this.rockMat);
        rockMesh.position.set(px, py + rScale * 0.6, pz);
        rockMesh.rotation.set((idx * 0.3) % Math.PI, (i * 0.7) % Math.PI, 0);
        rockMesh.castShadow = true;
        group.add(rockMesh);

        boxes.push({
          minX: px - rScale,
          maxX: px + rScale,
          minZ: pz - rScale,
          maxZ: pz + rScale,
          label: 'Roadside Boulder',
        });
      } else {
        // Tree / Shrub
        const treeGroup = new THREE.Group();
        treeGroup.position.set(px, py, pz);

        if (this.biome === 'alpine_pass') {
          // Scots Pine / Spruce: Tiered conical dark green foliage
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 2.5, 6), this.woodMat);
          trunk.position.y = 1.25;
          trunk.castShadow = true;
          treeGroup.add(trunk);

          [3.2, 5.0, 6.8].forEach((h, tier) => {
            const rad = 2.8 - tier * 0.7;
            const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, 2.6, 6), this.foliageMat);
            cone.position.y = h;
            cone.castShadow = true;
            treeGroup.add(cone);
          });
        } else if (this.biome === 'coastal_highway') {
          // Coastal Cypress: Wind-swept canopy
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 3.5, 6), this.woodMat);
          trunk.position.set(0, 1.75, 0);
          trunk.rotation.z = side * 0.18; // lean with sea wind
          trunk.castShadow = true;
          treeGroup.add(trunk);

          const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(2.6, 1), this.foliageMat);
          canopy.position.set(side * 0.6, 4.2, 0);
          canopy.scale.set(1.4, 0.75, 1.2);
          canopy.castShadow = true;
          treeGroup.add(canopy);
        } else {
          // Deciduous Oak / Birch
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.5, 3.2, 6), this.woodMat);
          trunk.position.y = 1.6;
          trunk.castShadow = true;
          treeGroup.add(trunk);

          const crown = new THREE.Mesh(new THREE.SphereGeometry(2.6, 7, 7), this.foliageMat);
          crown.position.y = 4.4;
          crown.castShadow = true;
          treeGroup.add(crown);
        }

        group.add(treeGroup);

        boxes.push({
          minX: px - 1.2,
          maxX: px + 1.2,
          minZ: pz - 1.2,
          maxZ: pz + 1.2,
          label: 'Tree Trunk',
        });
      }
    }
  }

  /**
   * Finds the closest point on the road spine for a given world coordinate (x, z)
   */
  public getClosestRoadPoint(x: number, z: number): RoutePoint {
    const s = Math.max(0, z);
    return this.evaluateSpine(s);
  }

  /**
   * Resets vehicle safely onto the road right-hand lane
   */
  public getSpawnTransform(distanceAhead: number = 20): { position: THREE.Vector3; heading: number } {
    const pt = this.evaluateSpine(distanceAhead);
    // Right-hand lane offset
    const laneOffset = 2.2;
    const posX = pt.x + pt.normal.x * laneOffset;
    const posZ = pt.z + pt.normal.z * laneOffset;
    const posY = pt.y + 0.1;
    const heading = Math.atan2(pt.tangent.x, pt.tangent.z);

    return {
      position: new THREE.Vector3(posX, posY, posZ),
      heading,
    };
  }

  /**
   * Returns all active collidable meshes (road deck, shoulders, terrain) for raycasting
   */
  public getTerrainColliders(): THREE.Object3D[] {
    const colliders: THREE.Object3D[] = [];
    this.activeSegments.forEach((seg) => {
      seg.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          colliders.push(child);
        }
      });
    });
    return colliders;
  }

  public dispose(): void {
    this.activeSegments.forEach((seg) => {
      this.scene.remove(seg.group);
      seg.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
        }
      });
    });
    this.activeSegments.clear();

    if (this.oceanWaterMesh) {
      this.scene.remove(this.oceanWaterMesh);
      this.oceanWaterMesh.geometry.dispose();
      this.oceanWaterMesh = null;
    }
  }
}
