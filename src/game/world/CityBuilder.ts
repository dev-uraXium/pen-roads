import * as THREE from 'three';
import { CollisionBox } from '../vehicle/VehiclePhysics';
import { BUS_STOPS, DISTRICTS, ROAD_NETWORK, RoadSegment } from './DistrictData';
import { getTerrainHeight, getWorldElevation } from './WorldElevation';

export interface BuiltWorld {
  root: THREE.Group;
  collisionBoxes: CollisionBox[];
  streetLamps: THREE.PointLight[];
  objectiveMarkerGroup: THREE.Group;
  beaconLight?: THREE.Mesh;
  trafficLights: THREE.Mesh[];
  waterMesh?: THREE.Mesh;
  roadMaterials: THREE.MeshStandardMaterial[];
  terrainMaterial: THREE.MeshStandardMaterial;
}

export class CityBuilder {
  public static buildWorld(): BuiltWorld {
    const root = new THREE.Group();
    const collisionBoxes: CollisionBox[] = [];
    const streetLamps: THREE.PointLight[] = [];
    const trafficLights: THREE.Mesh[] = [];
    const roadMaterials: THREE.MeshStandardMaterial[] = [];

    // ==========================================
    // 1. TERRAIN (Multi-Elevation Natural Mesh)
    // ==========================================
    const terrainRes = 96;
    const terrainSize = 1200;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainRes, terrainRes);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    const colorAttr = new Float32Array(posAttr.count * 3);

    const grassColor = new THREE.Color(0x2d4a22); // rich lush green
    const mountainRockColor = new THREE.Color(0x475569); // slate grey
    const snowColor = new THREE.Color(0xf1f5f9); // alpine snow
    const sandColor = new THREE.Color(0xbfa576); // shoreline sand
    const cityPavementColor = new THREE.Color(0x64748b); // town stone

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const h = getTerrainHeight(x, z);
      posAttr.setY(i, h);

      // Vertex Coloring based on location and height
      const tempColor = new THREE.Color();
      const distToPine = Math.hypot(x - (-240), z - (-220));
      const distToLake = Math.hypot(x - 220, z - 190);
      const distToCenter = Math.hypot(x, z);

      if (distToLake < 110 && h < 0.2) {
        tempColor.copy(sandColor);
      } else if (distToPine < 230 && h > 18) {
        tempColor.copy(snowColor);
      } else if (distToPine < 240 && h > 8) {
        tempColor.copy(mountainRockColor);
      } else if (distToCenter < 110) {
        tempColor.copy(cityPavementColor);
      } else {
        const varFactor = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.1;
        tempColor.copy(grassColor).offsetHSL(0, 0, varFactor);
      }

      colorAttr[i * 3] = tempColor.r;
      colorAttr[i * 3 + 1] = tempColor.g;
      colorAttr[i * 3 + 2] = tempColor.b;
    }

    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
    terrainGeo.computeVertexNormals();

    const terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.05,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMaterial);
    terrain.receiveShadow = true;
    root.add(terrain);

    // ==========================================
    // 2. LAKE NORTHBRIDGE & MARINA PIERS
    // ==========================================
    const waterGeo = new THREE.PlaneGeometry(290, 250, 24, 24);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.85,
      transparent: true,
      opacity: 0.88,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(220, -1.2, 190);
    root.add(waterMesh);

    // Lake Shoreline Boardwalk & Marina Docks
    const dockWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    for (let d = 0; d < 3; d++) {
      const pierMesh = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.6, 28), dockWoodMat);
      pierMesh.position.set(150 + d * 22, -0.9, 175 + d * 8);
      pierMesh.rotation.y = 0.3;
      pierMesh.receiveShadow = true;
      root.add(pierMesh);

      // Wooden mooring bollards along pier
      for (let p = -12; p <= 12; p += 6) {
        const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 }));
        bollard.position.set(150 + d * 22 + Math.cos(0.3) * (p > 0 ? 2 : -2), -0.5, 175 + d * 8 + p);
        root.add(bollard);
      }

      // Moored small pleasure boat with details
      const boatGroup = new THREE.Group();
      const hullMat = new THREE.MeshStandardMaterial({ color: d === 0 ? 0xffffff : d === 1 ? 0xef4444 : 0x0284c7, roughness: 0.3 });
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 6.2), hullMat);
      hull.position.y = -0.9;
      boatGroup.add(hull);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.95, 2.8), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2 }));
      cabin.position.set(0, -0.25, -0.6);
      boatGroup.add(cabin);

      // Mast and rigging
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.2, 8), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 }));
      mast.position.set(0, 1.2, -0.2);
      boatGroup.add(mast);

      boatGroup.position.set(153 + d * 22, 0, 185 + d * 8);
      boatGroup.rotation.y = 0.3;
      root.add(boatGroup);
    }

    // ==========================================
    // 3. ROADS & HIGHWAYS (Elevated 3D Decks)
    // ==========================================
    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.75,
      metalness: 0.15,
    });
    roadMaterials.push(asphaltMat);

    const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 }); // yellow center
    const whiteStripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    ROAD_NETWORK.forEach((road: RoadSegment) => {
      const x1 = road.p1[0], y1 = road.p1[1], z1 = road.p1[2];
      const x2 = road.p2[0], y2 = road.p2[1], z2 = road.p2[2];

      const dx = x2 - x1;
      const dy = y2 - y1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      const angleY = Math.atan2(dx, dz);
      const pitchX = -Math.atan2(dy, len);

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2 + 0.08;
      const midZ = (z1 + z2) / 2;

      const roadGroup = new THREE.Group();
      roadGroup.position.set(midX, midY, midZ);
      roadGroup.rotation.y = angleY;
      roadGroup.rotation.x = pitchX;

      // Asphalt Road Deck
      const roadGeo = new THREE.BoxGeometry(road.width, 0.18, len);
      const roadMesh = new THREE.Mesh(roadGeo, asphaltMat);
      roadMesh.receiveShadow = true;
      roadGroup.add(roadMesh);

      // Center Dividing Yellow Stripe (dashed)
      const dashCount = Math.floor(len / 6);
      for (let i = 0; i < dashCount; i++) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 2.5), stripeMat);
        dash.position.set(0, 0.1, -len / 2 + (i + 0.5) * 6);
        roadGroup.add(dash);
      }

      // White Edge Lines
      [-1, 1].forEach((side) => {
        const edgeLine = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.03, len), whiteStripeMat);
        edgeLine.position.set(side * (road.width / 2 - 0.6), 0.1, 0);
        roadGroup.add(edgeLine);
      });

      // Curbs or Guardrails
      if (road.isBridge || road.isMountain) {
        const railMat = new THREE.MeshStandardMaterial({
          color: road.isBridge ? 0xe2e8f0 : 0x71717a,
          metalness: 0.6,
          roughness: 0.3,
        });

        [-1, 1].forEach((side) => {
          const railX = side * (road.width / 2 + 0.4);
          const beam = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, len), railMat);
          beam.position.set(railX, 0.75, 0);
          roadGroup.add(beam);

          const postCount = Math.floor(len / 8);
          for (let p = 0; p <= postCount; p++) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 8), railMat);
            post.position.set(railX, 0.45, -len / 2 + p * 8);
            roadGroup.add(post);
          }
        });
      } else {
        const curbWidth = 2.4;
        const curbHeight = 0.28;
        [-1, 1].forEach((side) => {
          const curb = new THREE.Mesh(new THREE.BoxGeometry(curbWidth, curbHeight, len), curbMat);
          curb.position.set(side * (road.width / 2 + curbWidth / 2), curbHeight / 2 - 0.04, 0);
          curb.receiveShadow = true;
          roadGroup.add(curb);
        });
      }

      root.add(roadGroup);
    });

    // Road Junction Pavements & Zebra Crossings
    const junctionPoints: [number, number][] = [
      [-80, -80], [80, -80], [80, 80], [-80, 80],
      [0, 0], [0, 80], [0, -80], [-80, 0], [80, 0],
      [160, 120], [240, 160], [-140, 90], [-200, 130],
      [150, -100], [220, -140], [-110, -140], [-170, -180]
    ];
    junctionPoints.forEach(([jx, jz]) => {
      const jy = getWorldElevation(jx, jz) + 0.1;
      const padMesh = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 0.16, 20), asphaltMat);
      padMesh.position.set(jx, jy, jz);
      padMesh.receiveShadow = true;
      root.add(padMesh);

      // Zebra Crossings at downtown junctions
      if (Math.hypot(jx, jz) < 100) {
        for (let a = 0; a < 4; a++) {
          const crossGroup = new THREE.Group();
          crossGroup.position.set(jx, jy + 0.09, jz);
          crossGroup.rotation.y = a * (Math.PI / 2);
          for (let s = -3; s <= 3; s++) {
            const bar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 2.8), whiteStripeMat);
            bar.position.set(s * 1.4, 0, 8.5);
            crossGroup.add(bar);
          }
          root.add(crossGroup);
        }
      }
    });

    // ==========================================
    // 4. SUSPENSION BRIDGE
    // ==========================================
    const bridgeGroup = new THREE.Group();
    const bridgeTowerMat = new THREE.MeshStandardMaterial({
      color: 0xc2410c, // international orange
      roughness: 0.35,
      metalness: 0.4,
    });
    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.2,
    });

    const towerPositions: [number, number][] = [
      [185, 132],
      [215, 148],
    ];

    towerPositions.forEach(([tx, tz]) => {
      const baseH = getWorldElevation(tx, tz);
      const towerHeight = 36.0;

      [-1, 1].forEach((legSide) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(2.4, towerHeight, 2.4), bridgeTowerMat);
        const angle = Math.atan2(80, 40) + Math.PI / 2;
        const offX = Math.cos(angle) * legSide * 7.5;
        const offZ = Math.sin(angle) * legSide * 7.5;
        leg.position.set(tx + offX, baseH + towerHeight / 2 - 4, tz + offZ);
        leg.castShadow = true;
        bridgeGroup.add(leg);

        collisionBoxes.push({
          minX: tx + offX - 1.8,
          maxX: tx + offX + 1.8,
          minZ: tz + offZ - 1.8,
          maxZ: tz + offZ + 1.8,
          label: 'Bridge Tower',
        });
      });

      // Upper Arch Cross-beam
      const archBeam = new THREE.Mesh(new THREE.BoxGeometry(17, 3.5, 2.2), bridgeTowerMat);
      archBeam.position.set(tx, baseH + towerHeight - 6, tz);
      archBeam.rotation.y = Math.atan2(80, 40);
      bridgeGroup.add(archBeam);

      // Red Aviation Warning Beacon on top of tower
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      beacon.position.set(tx, baseH + towerHeight + 0.6, tz);
      bridgeGroup.add(beacon);

      // Pier foundation in lakebed
      const foundation = new THREE.Mesh(new THREE.BoxGeometry(18, 6, 8), new THREE.MeshStandardMaterial({ color: 0x475569 }));
      foundation.position.set(tx, -1.0, tz);
      foundation.rotation.y = Math.atan2(80, 40);
      bridgeGroup.add(foundation);
    });

    // Parabolic Suspension Cables
    [-1, 1].forEach((side) => {
      const angle = Math.atan2(40, 80) + Math.PI / 2;
      const offX = Math.cos(angle) * side * 7.2;
      const offZ = Math.sin(angle) * side * 7.2;

      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(160 + offX, 2.5, 120 + offZ),
        new THREE.Vector3(200 + offX, 32.0, 140 + offZ),
        new THREE.Vector3(240 + offX, 2.5, 160 + offZ)
      );

      const cableGeo = new THREE.TubeGeometry(curve, 32, 0.25, 8, false);
      const cableMesh = new THREE.Mesh(cableGeo, cableMat);
      bridgeGroup.add(cableMesh);

      for (let h = 1; h < 16; h++) {
        const t = h / 16;
        const pt = curve.getPoint(t);
        const deckY = getWorldElevation(pt.x, pt.z);
        const hangerLen = pt.y - deckY;
        if (hangerLen > 0.5) {
          const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, hangerLen, 6), cableMat);
          hanger.position.set(pt.x, deckY + hangerLen / 2, pt.z);
          bridgeGroup.add(hanger);
        }
      }
    });

    root.add(bridgeGroup);

    // ==========================================
    // 5. CENTRAL SQUARE DISTRICT LANDMARKS
    // ==========================================
    // A. Central Civic Park & Plaza
    const parkMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
    const parkPlaza = new THREE.Mesh(new THREE.BoxGeometry(45, 0.22, 45), parkMat);
    parkPlaza.position.set(-48, getWorldElevation(-48, 48) + 0.1, 48);
    parkPlaza.receiveShadow = true;
    root.add(parkPlaza);

    // B. Grand Classical Fountain
    const fountainGroup = new THREE.Group();
    const fountainX = -48;
    const fountainZ = 48;
    const fountainY = getWorldElevation(fountainX, fountainZ) + 0.12;
    fountainGroup.position.set(fountainX, fountainY, fountainZ);

    const basinOuter = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 1.2, 24), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    fountainGroup.add(basinOuter);

    const fountainWater = new THREE.Mesh(new THREE.CylinderGeometry(7.8, 7.8, 0.2, 24), waterMat);
    fountainWater.position.y = 0.5;
    fountainGroup.add(fountainWater);

    const tieredStem = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.4, 4.5, 16), new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }));
    tieredStem.position.y = 2.4;
    fountainGroup.add(tieredStem);

    const upperBasin = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 2.5, 0.8, 20), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    upperBasin.position.y = 3.6;
    fountainGroup.add(upperBasin);

    const bronzeStatue = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x78350f, metalness: 0.7 }));
    bronzeStatue.position.y = 5.0;
    fountainGroup.add(bronzeStatue);
    root.add(fountainGroup);

    collisionBoxes.push({
      minX: fountainX - 9,
      maxX: fountainX + 9,
      minZ: fountainZ - 9,
      maxZ: fountainZ + 9,
      label: 'Grand Classical Fountain',
    });

    // C. 4-Way Traffic Signal Gantries at (0, 0)
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6 });
    const signalHeadMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });

    const cornerOffsets: [number, number, number][] = [
      [11, 11, Math.PI],
      [-11, 11, -Math.PI / 2],
      [-11, -11, 0],
      [11, -11, Math.PI / 2],
    ];

    cornerOffsets.forEach(([cx, cz, rot]) => {
      const gantryGroup = new THREE.Group();
      gantryGroup.position.set(cx, getWorldElevation(cx, cz) + 0.1, cz);
      gantryGroup.rotation.y = rot;

      const vPost = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6.8, 8), poleMat);
      vPost.position.y = 3.4;
      gantryGroup.add(vPost);

      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 6.5, 8), poleMat);
      arm.rotateZ(Math.PI / 2);
      arm.position.set(-3.2, 6.4, 0);
      gantryGroup.add(arm);

      // Signal housing
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 0.5), signalHeadMat);
      box.position.set(-4.5, 5.6, 0);
      gantryGroup.add(box);

      // Lenses with sun visors
      const rLens = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), redMat);
      rLens.position.set(-4.5, 6.1, 0.26);
      const rVisor = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.15, 8, 1, true, 0, Math.PI), signalHeadMat);
      rVisor.rotateX(Math.PI / 2);
      rVisor.position.set(-4.5, 6.15, 0.3);
      gantryGroup.add(rLens, rVisor);

      const yLens = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), yellowMat);
      yLens.position.set(-4.5, 5.6, 0.26);
      gantryGroup.add(yLens);

      const gLens = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), greenMat);
      gLens.position.set(-4.5, 5.1, 0.26);
      gantryGroup.add(gLens);

      trafficLights.push(gLens);
      root.add(gantryGroup);
    });

    // D. Historic Stone Clock Tower (x: -35, z: -35)
    const towerBaseX = -35;
    const towerBaseZ = -35;
    const towerBaseY = getWorldElevation(towerBaseX, towerBaseZ);

    const clockTowerGroup = new THREE.Group();
    clockTowerGroup.position.set(towerBaseX, towerBaseY, towerBaseZ);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.8 });
    const trimStoneMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.5 });
    const copperRoofMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.4 });

    const t1 = new THREE.Mesh(new THREE.BoxGeometry(10, 16, 10), stoneMat);
    t1.position.y = 8;
    t1.castShadow = true;
    clockTowerGroup.add(t1);

    const t2 = new THREE.Mesh(new THREE.BoxGeometry(8.5, 14, 8.5), trimStoneMat);
    t2.position.y = 23;
    t2.castShadow = true;
    clockTowerGroup.add(t2);

    const t3 = new THREE.Mesh(new THREE.BoxGeometry(9.4, 7, 9.4), stoneMat);
    t3.position.y = 33.5;
    clockTowerGroup.add(t3);

    const clockDialMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef08a,
      emissiveIntensity: 0.8,
    });
    for (let c = 0; c < 4; c++) {
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.2, 24), clockDialMat);
      dial.rotateX(Math.PI / 2);
      const angle = c * (Math.PI / 2);
      dial.position.set(Math.sin(angle) * 4.75, 33.5, Math.cos(angle) * 4.75);
      dial.rotation.y = angle;
      clockTowerGroup.add(dial);
    }

    const spire = new THREE.Mesh(new THREE.ConeGeometry(5.2, 14, 8), copperRoofMat);
    spire.position.y = 44;
    spire.castShadow = true;
    clockTowerGroup.add(spire);
    root.add(clockTowerGroup);

    collisionBoxes.push({
      minX: towerBaseX - 6,
      maxX: towerBaseX + 6,
      minZ: towerBaseZ - 6,
      maxZ: towerBaseZ + 6,
      label: 'Historic Clock Tower',
    });

    // E. Central Bus Terminal Shelter & Bay (x: 20, z: 25)
    const busShelterGroup = new THREE.Group();
    busShelterGroup.position.set(20, getWorldElevation(20, 25), 25);

    const shelterGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
    });
    const shelterRoof = new THREE.Mesh(new THREE.BoxGeometry(22, 0.4, 7), shelterGlassMat);
    shelterRoof.position.set(0, 3.8, 0);
    busShelterGroup.add(shelterRoof);

    // Support pillars & timetable totem
    for (let p = -8; p <= 8; p += 8) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.8, 12), new THREE.MeshStandardMaterial({ color: 0x334155 }));
      pole.position.set(p, 1.9, -2.5);
      busShelterGroup.add(pole);
    }

    const bench = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 0.8), new THREE.MeshStandardMaterial({ color: 0x78350f }));
    bench.position.set(0, 0.5, -2.2);
    busShelterGroup.add(bench);

    // Transit schedule totem sign
    const totem = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
    totem.position.set(9.5, 1.1, -2.5);
    busShelterGroup.add(totem);

    root.add(busShelterGroup);

    // ==========================================
    // 6. OLD TOWN DISTRICT (Timber-Framed Houses & Arches)
    // ==========================================
    const oldTownCenter = DISTRICTS.old_town.center;
    const oldTownArchMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.85 });

    // Stone Gateways spanning over the road
    const archPositions: [number, number, number][] = [
      [-170, 115, 0.5],
      [-210, 150, -0.4],
      [-140, 190, 0.8],
    ];

    archPositions.forEach(([ax, az, rot]) => {
      const ay = getWorldElevation(ax, az);
      const archGroup = new THREE.Group();
      archGroup.position.set(ax, ay, az);
      archGroup.rotation.y = rot;

      const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 7.0, 2.4), oldTownArchMat);
      leftPillar.position.set(-6.5, 3.5, 0);
      archGroup.add(leftPillar);

      const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 7.0, 2.4), oldTownArchMat);
      rightPillar.position.set(6.5, 3.5, 0);
      archGroup.add(rightPillar);

      const archSpan = new THREE.Mesh(new THREE.BoxGeometry(15.4, 2.2, 2.6), oldTownArchMat);
      archSpan.position.set(0, 7.1, 0);
      archGroup.add(archSpan);

      // Hanging iron lantern
      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.6), new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.9,
      }));
      lantern.position.set(0, 5.6, 0);
      archGroup.add(lantern);

      root.add(archGroup);

      collisionBoxes.push(
        { minX: ax - 8, maxX: ax - 5, minZ: az - 2, maxZ: az + 2, label: 'Arch Pillar Left' },
        { minX: ax + 5, maxX: ax + 8, minZ: az - 2, maxZ: az + 2, label: 'Arch Pillar Right' }
      );
    });

    // Historic Half-Timbered Medieval Houses
    const timberBeamsMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
    const plasterMat = new THREE.MeshStandardMaterial({ color: 0xfaf5ee, roughness: 0.8 });
    const terracottaMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.6 });

    for (let b = 0; b < 14; b++) {
      const angle = (b / 14) * Math.PI * 2;
      const radius = 65 + (b % 3) * 15;
      const bx = oldTownCenter[0] + Math.cos(angle) * radius;
      const bz = oldTownCenter[1] + Math.sin(angle) * radius;
      const by = getWorldElevation(bx, bz);

      const bGroup = new THREE.Group();
      bGroup.position.set(bx, by, bz);
      bGroup.rotation.y = angle + Math.PI;

      const width = 12 + (b % 4) * 2;
      const height = 10 + (b % 3) * 3;
      const depth = 14;

      // Ground floor stone base
      const stoneBase = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.45, depth), stoneMat);
      stoneBase.position.y = (height * 0.45) / 2;
      stoneBase.castShadow = true;
      bGroup.add(stoneBase);

      // Upper floor overhanging jetty
      const upperFloor = new THREE.Mesh(new THREE.BoxGeometry(width + 0.8, height * 0.55, depth + 0.8), plasterMat);
      upperFloor.position.y = height * 0.45 + (height * 0.55) / 2;
      upperFloor.castShadow = true;
      bGroup.add(upperFloor);

      // Exposed dark timber decorative cross-beams
      for (let tx = -width / 2 + 1; tx <= width / 2 - 1; tx += 3.5) {
        const vBeam = new THREE.Mesh(new THREE.BoxGeometry(0.25, height * 0.55, depth + 0.9), timberBeamsMat);
        vBeam.position.set(tx, height * 0.45 + (height * 0.55) / 2, 0);
        bGroup.add(vBeam);
      }

      // Pitched Terracotta Roof
      const roof = new THREE.Mesh(new THREE.ConeGeometry(width * 0.78, 5.8, 4), terracottaMat);
      roof.position.y = height + 2.9;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      bGroup.add(roof);

      // Stone Chimney with twin clay pots
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.8, 1.4), stoneMat);
      chimney.position.set(width * 0.28, height + 4.2, 0);
      const pot1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8), terracottaMat);
      pot1.position.set(width * 0.28 - 0.3, height + 6.3, 0);
      const pot2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8), terracottaMat);
      pot2.position.set(width * 0.28 + 0.3, height + 6.3, 0);
      bGroup.add(chimney, pot1, pot2);

      root.add(bGroup);

      collisionBoxes.push({
        minX: bx - width / 2,
        maxX: bx + width / 2,
        minZ: bz - depth / 2,
        maxZ: bz + depth / 2,
        label: 'Old Town House',
      });
    }

    // Old Town Open-Air Market Stalls
    const stallColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b];
    for (let m = 0; m < 4; m++) {
      const mx = oldTownCenter[0] - 18 + (m % 2) * 14;
      const mz = oldTownCenter[1] - 15 + Math.floor(m / 2) * 12;
      const my = getWorldElevation(mx, mz);

      const stall = new THREE.Group();
      stall.position.set(mx, my, mz);

      const table = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 2.2), dockWoodMat);
      table.position.y = 0.45;
      stall.add(table);

      // Striped Awning Canopy
      const awning = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.15, 2.6), new THREE.MeshStandardMaterial({
        color: stallColors[m],
        roughness: 0.8,
      }));
      awning.position.set(0, 2.5, 0);
      awning.rotation.x = 0.15;
      stall.add(awning);

      // Awning timber poles
      [[-2, -1], [2, -1], [-2, 1], [2, 1]].forEach(([px, pz]) => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6), dockWoodMat);
        p.position.set(px, 1.25, pz);
        stall.add(p);
      });

      root.add(stall);
    }

    // ==========================================
    // 7. INDUSTRIAL YARD (Lattice Gantry Crane, Tanks & Docks)
    // ==========================================
    const indCenter = DISTRICTS.industrial_yard.center;

    // A. Giant Industrial Truss Gantry Crane (x: 230, z: -160)
    const craneGroup = new THREE.Group();
    craneGroup.position.set(indCenter[0], getWorldElevation(indCenter[0], indCenter[1]), indCenter[1]);

    const craneMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.7, roughness: 0.3 });
    const craneSpan = 40.0;
    const craneHeight = 25.0;

    // Realistic Lattice Truss A-Frames
    [-1, 1].forEach((side) => {
      const aFrame = new THREE.Group();
      aFrame.position.set(side * (craneSpan / 2), 0, 0);

      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, craneHeight, 1.2), craneMat);
      leg1.position.set(0, craneHeight / 2, -4.5);
      leg1.rotation.x = 0.14;
      aFrame.add(leg1);

      const leg2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, craneHeight, 1.2), craneMat);
      leg2.position.set(0, craneHeight / 2, 4.5);
      leg2.rotation.x = -0.14;
      aFrame.add(leg2);

      // Diagonal cross-lacing struts
      for (let l = 4; l < craneHeight - 2; l += 5) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 8.5), craneMat);
        brace.position.set(0, l, 0);
        brace.rotation.x = (l % 10 === 0 ? 1 : -1) * 0.45;
        aFrame.add(brace);
      }

      // Wheel bogies on rail tracks
      const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.4, 13), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 }));
      bogie.position.y = 0.7;
      aFrame.add(bogie);

      craneGroup.add(aFrame);

      collisionBoxes.push({
        minX: indCenter[0] + side * (craneSpan / 2) - 2.5,
        maxX: indCenter[0] + side * (craneSpan / 2) + 2.5,
        minZ: indCenter[1] - 6.5,
        maxZ: indCenter[1] + 6.5,
        label: 'Gantry Crane Leg',
      });
    });

    // Horizontal Double Truss Bridge Beam
    const craneBeam = new THREE.Mesh(new THREE.BoxGeometry(craneSpan + 6, 2.8, 3.6), craneMat);
    craneBeam.position.y = craneHeight;
    craneBeam.castShadow = true;
    craneGroup.add(craneBeam);

    // Motorized Hoist Trolley, Cable & Heavy Steel Hook
    const trolley = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.8, 4.2), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 }));
    trolley.position.set(4, craneHeight - 1.2, 0);
    craneGroup.add(trolley);

    const hoistCable = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 9, 6), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 }));
    hoistCable.position.set(4, craneHeight - 6.5, 0);
    const cargoHook = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 8, 16, Math.PI * 1.4), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 }));
    cargoHook.position.set(4, craneHeight - 11.2, 0);
    cargoHook.rotation.z = Math.PI / 2;
    craneGroup.add(hoistCable, cargoHook);

    // Operator Glass Cabin
    const opCabin = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.5, 3.2), new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 }));
    opCabin.position.set(8.5, craneHeight - 2.8, 0);
    craneGroup.add(opCabin);

    root.add(craneGroup);

    // B. Shipping Container Stacks with Locking Details
    const containerColors = [0x0284c7, 0xb91c1c, 0x047857, 0xd97706, 0x4f46e5];
    for (let c = 0; c < 18; c++) {
      const row = Math.floor(c / 6);
      const col = c % 6;
      const stackHeight = 1 + (c % 3);

      const cx = indCenter[0] + 35 + row * 16;
      const cz = indCenter[1] - 40 + col * 12;
      const cy = getWorldElevation(cx, cz);

      for (let s = 0; s < stackHeight; s++) {
        const cMat = new THREE.MeshStandardMaterial({
          color: containerColors[(c + s) % containerColors.length],
          metalness: 0.35,
          roughness: 0.45,
        });
        const container = new THREE.Mesh(new THREE.BoxGeometry(6.0, 2.6, 12.0), cMat);
        container.position.set(cx, cy + 1.3 + s * 2.6, cz);
        container.castShadow = true;

        // Container Corner Castings (Black corner fittings)
        const cornerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
        [-2.95, 2.95].forEach((kx) => {
          [-5.95, 5.95].forEach((kz) => {
            const corner = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), cornerMat);
            corner.position.set(kx, 1.15, kz);
            container.add(corner);
          });
        });

        root.add(container);
      }

      collisionBoxes.push({
        minX: cx - 3.2,
        maxX: cx + 3.2,
        minZ: cz - 6.2,
        maxZ: cz + 6.2,
        label: 'Container Stack',
      });
    }

    // C. Chemical & Fuel Storage Cylinders with Catwalks
    for (let t = 0; t < 3; t++) {
      const tx = indCenter[0] - 50 + t * 24;
      const tz = indCenter[1] - 60;
      const ty = getWorldElevation(tx, tz);

      const tank = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 14, 20), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7 }));
      tank.position.set(tx, ty + 7, tz);
      tank.castShadow = true;
      root.add(tank);

      // Safety Catwalk Ring
      const catwalk = new THREE.Mesh(new THREE.RingGeometry(8.05, 9.2, 24), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, side: THREE.DoubleSide }));
      catwalk.rotateX(-Math.PI / 2);
      catwalk.position.set(tx, ty + 12.5, tz);
      root.add(catwalk);

      collisionBoxes.push({
        minX: tx - 8.5,
        maxX: tx + 8.5,
        minZ: tz - 8.5,
        maxZ: tz + 8.5,
        label: 'Fuel Tank',
      });
    }

    // ==========================================
    // 8. PINE RIDGE MOUNTAIN (Summit Mast & Cabins)
    // ==========================================
    const pineCenter = DISTRICTS.pine_ridge.center;

    // A. Summit Radio Tower Mast (x: -260, z: -250)
    const mastX = pineCenter[0] - 20;
    const mastZ = pineCenter[1] - 20;
    const mastBaseY = getWorldElevation(mastX, mastZ);
    const mastHeight = 38.0;

    const mastGroup = new THREE.Group();
    mastGroup.position.set(mastX, mastBaseY, mastZ);

    const mastMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.8, roughness: 0.2 });

    const mastSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 1.8, mastHeight, 4), mastMat);
    mastSpire.position.y = mastHeight / 2;
    mastGroup.add(mastSpire);

    [18, 26, 32].forEach((h, idx) => {
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.6, 16), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      dish.rotateZ(Math.PI / 2);
      dish.position.set(1.2 * (idx % 2 === 0 ? 1 : -1), h, 0);
      mastGroup.add(dish);
    });

    const beaconGeo = new THREE.SphereGeometry(0.8, 12, 12);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const beaconLight = new THREE.Mesh(beaconGeo, beaconMat);
    beaconLight.position.y = mastHeight + 0.5;
    mastGroup.add(beaconLight);

    root.add(mastGroup);

    collisionBoxes.push({
      minX: mastX - 4,
      maxX: mastX + 4,
      minZ: mastZ - 4,
      maxZ: mastZ + 4,
      label: 'Summit Radio Mast',
    });

    // B. Alpine Timber Cabins
    for (let a = 0; a < 8; a++) {
      const angle = (a / 8) * Math.PI * 2;
      const ax = pineCenter[0] + Math.cos(angle) * (50 + (a % 3) * 15);
      const az = pineCenter[1] + Math.sin(angle) * (50 + (a % 3) * 15);
      const ay = getWorldElevation(ax, az);

      const cabinGroup = new THREE.Group();
      cabinGroup.position.set(ax, ay, az);
      cabinGroup.rotation.y = angle;

      const found = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.5, 9.5), new THREE.MeshStandardMaterial({ color: 0x57534e }));
      found.position.y = 0.75;
      cabinGroup.add(found);

      const walls = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 9), new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 }));
      walls.position.y = 4.0;
      walls.castShadow = true;
      cabinGroup.add(walls);

      const aRoof = new THREE.Mesh(new THREE.ConeGeometry(7.5, 4.5, 4), new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 }));
      aRoof.position.y = 8.75;
      aRoof.rotation.y = Math.PI / 4;
      aRoof.castShadow = true;
      cabinGroup.add(aRoof);

      // Cozy glowing window
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 0.2), new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.7,
      }));
      win.position.set(0, 4.2, 4.55);
      cabinGroup.add(win);

      root.add(cabinGroup);

      collisionBoxes.push({
        minX: ax - 5.5,
        maxX: ax + 5.5,
        minZ: az - 5.0,
        maxZ: az + 5.0,
        label: 'Alpine Cabin',
      });
    }

    // ==========================================
    // 9. DOWNTOWN ARCHITECTURAL DIVERSITY (5 Building Classes)
    // ==========================================
    const cityBlocks: [number, number, number][] = [
      // [x, z, archetype (0: Skyscraper, 1: Municipal Palace, 2: Commercial Plaza, 3: Brownstone, 4: Gas Station)]
      [-50, -50, 0], // The Grand Pinnacle Tower
      [50, -50, 1],  // Metropolitan Municipal Hall
      [-50, 50, 2],  // Midtown Retail Plaza
      [50, 50, 3],   // Hudson Brownstone Apartments
      [-50, -110, 4], // Fast Fuel Service Plaza
      [50, -110, 0], // Skyscraper 2
      [-110, -50, 2], // Commercial Center
      [-110, 50, 3],  // Brownstone Row
      [110, -50, 0],  // Glass Highrise
      [110, 50, 2],   // Plaza
    ];

    cityBlocks.forEach(([bx, bz, type], i) => {
      const by = getWorldElevation(bx, bz);
      const bGroup = new THREE.Group();
      bGroup.position.set(bx, by, bz);

      const bWidth = 26;
      const bDepth = 26;
      const blackTrimMat = new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.8 });

      if (type === 0) {
        // --- ARCHETYPE 0: MODERN GLASS SKYSCRAPER WITH TIERED SETBACKS ---
        const towerHeight = 52.0;

        // Base Tower Tier (Floors 1-8)
        const baseMesh = new THREE.Mesh(
          new THREE.BoxGeometry(bWidth, 24, bDepth),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 })
        );
        baseMesh.position.y = 12;
        baseMesh.castShadow = true;
        bGroup.add(baseMesh);

        // Glass Curtain Wall Facade Ribs
        const curGlass = new THREE.MeshStandardMaterial({
          color: 0x93c5fd,
          emissive: 0x1e3a8a,
          emissiveIntensity: 0.25,
          roughness: 0.05,
          metalness: 0.95,
        });
        for (let fl = 5; fl < 22; fl += 3.5) {
          const band = new THREE.Mesh(new THREE.BoxGeometry(bWidth + 0.15, 1.8, bDepth + 0.15), curGlass);
          band.position.y = fl;
          bGroup.add(band);
        }

        // Setback Tier 2 (Floors 9-16)
        const midMesh = new THREE.Mesh(
          new THREE.BoxGeometry(bWidth * 0.78, 18, bDepth * 0.78),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 })
        );
        midMesh.position.y = 33;
        midMesh.castShadow = true;
        bGroup.add(midMesh);

        for (let fl = 26; fl < 40; fl += 3.5) {
          const band = new THREE.Mesh(new THREE.BoxGeometry(bWidth * 0.78 + 0.15, 1.8, bDepth * 0.78 + 0.15), curGlass);
          band.position.y = fl;
          bGroup.add(band);
        }

        // Crown Penthouse & Spire (Tier 3)
        const crown = new THREE.Mesh(
          new THREE.BoxGeometry(bWidth * 0.55, 10, bDepth * 0.55),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9, roughness: 0.1 })
        );
        crown.position.y = 47;
        bGroup.add(crown);

        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 1.2, 14, 8), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95 }));
        spire.position.y = 59;
        bGroup.add(spire);

        // Ground Floor Grand Marble Lobby with Glass Revolving Entrance
        const lobby = new THREE.Mesh(new THREE.BoxGeometry(bWidth + 0.2, 4.5, bDepth + 0.2), new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.45,
          roughness: 0.15,
        }));
        lobby.position.y = 2.25;
        bGroup.add(lobby);

        // Entrance Glass Canopy
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 4), new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 }));
        canopy.position.set(0, 4.6, bDepth / 2 + 2);
        bGroup.add(canopy);
      } else if (type === 1) {
        // --- ARCHETYPE 1: METROPOLITAN MUNICIPAL PALACE (BEAUX-ARTS) ---
        const bHeight = 24.0;
        const stoneFacade = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.65 });

        // Monumental Stone Base
        const palaceBody = new THREE.Mesh(new THREE.BoxGeometry(bWidth, bHeight * 0.75, bDepth), stoneFacade);
        palaceBody.position.y = (bHeight * 0.75) / 2;
        palaceBody.castShadow = true;
        bGroup.add(palaceBody);

        // Front Portico with Fluted Columns & Pediment
        const porticoGroup = new THREE.Group();
        porticoGroup.position.set(0, 0, bDepth / 2 + 1.2);

        // Grand Steps
        for (let st = 0; st < 5; st++) {
          const step = new THREE.Mesh(new THREE.BoxGeometry(16 - st * 0.8, 0.3, 4 - st * 0.5), stoneFacade);
          step.position.set(0, st * 0.3, (4 - st * 0.5) / 2);
          porticoGroup.add(step);
        }

        // 6 Monumental Fluted Columns
        for (let col = -2.5; col <= 2.5; col++) {
          const column = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 9.5, 12), stoneFacade);
          column.position.set(col * 2.5, 6.2, 0.5);
          porticoGroup.add(column);
        }

        // Triangular Pediment over Portico
        const pediment = new THREE.Mesh(new THREE.ConeGeometry(8.5, 3.8, 3), stoneFacade);
        pediment.position.set(0, 12.8, 0.5);
        pediment.rotation.z = Math.PI;
        pediment.rotation.y = Math.PI / 2;
        porticoGroup.add(pediment);
        bGroup.add(porticoGroup);

        // Grand Central Copper Dome & Rotunda
        const rotunda = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 4.5, 16), stoneFacade);
        rotunda.position.y = bHeight * 0.75 + 2.25;
        const dome = new THREE.Mesh(new THREE.SphereGeometry(6.8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), copperRoofMat);
        dome.position.y = bHeight * 0.75 + 4.5;
        bGroup.add(rotunda, dome);
      } else if (type === 2) {
        // --- ARCHETYPE 2: MIDTOWN RETAIL PLAZA & CAFE ---
        const bHeight = 20.0;
        const commMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });

        const commBody = new THREE.Mesh(new THREE.BoxGeometry(bWidth, bHeight, bDepth), commMat);
        commBody.position.y = bHeight / 2;
        commBody.castShadow = true;
        bGroup.add(commBody);

        // Ground Floor Shopfronts & Boutiques
        const shopGlass = new THREE.Mesh(new THREE.BoxGeometry(bWidth + 0.2, 4.2, bDepth + 0.2), new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.5,
          roughness: 0.15,
        }));
        shopGlass.position.y = 2.1;
        bGroup.add(shopGlass);

        // Striped Colorful Fabric Awnings
        const awningColors = [0xb91c1c, 0x1d4ed8, 0x047857];
        [-1, 1].forEach((side, sIdx) => {
          const awn = new THREE.Mesh(new THREE.BoxGeometry(bWidth * 0.42, 0.4, 2.5), new THREE.MeshStandardMaterial({
            color: awningColors[(i + sIdx) % awningColors.length],
            roughness: 0.7,
          }));
          awn.position.set(side * (bWidth * 0.25), 4.3, bDepth / 2 + 1.25);
          awn.rotation.x = 0.25;
          bGroup.add(awn);
        });

        // Rooftop Billboard Advertisements ("GRIDLINE", "METRO COFFEE")
        const boardGroup = new THREE.Group();
        boardGroup.position.set(0, bHeight + 3.2, 0);
        const board = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 0.6), new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.4,
          roughness: 0.3,
        }));
        const legs = new THREE.Mesh(new THREE.BoxGeometry(14, 2, 0.3), new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 }));
        legs.position.y = -2.5;
        boardGroup.add(board, legs);
        bGroup.add(boardGroup);
      } else if (type === 3) {
        // --- ARCHETYPE 3: HUDSON BROWNSTONE RESIDENTIAL APARTMENTS ---
        const bHeight = 22.0;
        const brickMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.85 }); // classic red brick

        const brickBody = new THREE.Mesh(new THREE.BoxGeometry(bWidth, bHeight, bDepth), brickMat);
        brickBody.position.y = bHeight / 2;
        brickBody.castShadow = true;
        bGroup.add(brickBody);

        // Protruding Bay Windows on upper floors
        for (let fl = 5; fl < bHeight - 2; fl += 4.5) {
          [-6, 6].forEach((wx) => {
            const bay = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.8, 1.2), new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 }));
            bay.position.set(wx, fl, bDepth / 2 + 0.6);
            bGroup.add(bay);
          });
        }

        // Exterior Black Wrought-Iron Fire Escape
        const fireEscape = new THREE.Group();
        fireEscape.position.set(0, 0, bDepth / 2 + 0.8);
        for (let fl = 5; fl < bHeight - 2; fl += 4.5) {
          const balcony = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.2, 1.8), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 }));
          balcony.position.set(0, fl, 0);
          const railing = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.8, 1.8), new THREE.MeshStandardMaterial({ color: 0x0f172a, wireframe: true }));
          railing.position.set(0, fl + 0.4, 0);
          fireEscape.add(balcony, railing);
        }
        bGroup.add(fireEscape);

        // Rooftop Wooden Water Tank
        const tankGroup = new THREE.Group();
        tankGroup.position.set(-5, bHeight, -5);
        const wTank = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 3.8, 12), new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 }));
        wTank.position.y = 3.6;
        const wRoof = new THREE.Mesh(new THREE.ConeGeometry(3.0, 1.8, 12), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
        wRoof.position.y = 6.2;
        tankGroup.add(wTank, wRoof);
        bGroup.add(tankGroup);
      } else {
        // --- ARCHETYPE 4: FAST FUEL SERVICE PLAZA ---
        const stationMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });

        // Convenience Mini-Mart Building (Back half of block)
        const mart = new THREE.Mesh(new THREE.BoxGeometry(bWidth, 5.5, 11), stationMat);
        mart.position.set(0, 2.75, -6);
        mart.castShadow = true;
        bGroup.add(mart);

        // Mart Large Glass Storefront
        const martGlass = new THREE.Mesh(new THREE.BoxGeometry(bWidth * 0.88, 3.5, 0.2), new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.5,
        }));
        martGlass.position.set(0, 2.4, -0.4);
        bGroup.add(martGlass);

        // Massive Illuminated Cantilevered Fuel Canopy
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(bWidth, 0.9, 13), new THREE.MeshStandardMaterial({
          color: 0xef4444, // Vibrant Fuel Red
          emissive: 0xdc2626,
          emissiveIntensity: 0.35,
          roughness: 0.3,
        }));
        canopy.position.set(0, 5.2, 5.5);
        bGroup.add(canopy);

        // 4 Fuel Pump Islands
        for (let p = -1; p <= 1; p += 2) {
          const island = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.3, 8), curbMat);
          island.position.set(p * 6, 0.15, 5.5);
          bGroup.add(island);

          // 2 Dual-Hose Fuel Dispensers per island
          [-2, 2].forEach((pz) => {
            const pump = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.1, 0.8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
            pump.position.set(p * 6, 1.2, 5.5 + pz);
            const nozzle = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 0.3), blackTrimMat);
            nozzle.position.set(p * 6, 1.4, 5.5 + pz);
            bGroup.add(pump, nozzle);
          });

          // Canopy Support Steel Columns
          const pColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5.2, 12), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 }));
          pColumn.position.set(p * 6, 2.6, 5.5);
          bGroup.add(pColumn);
        }

        // Roadside Price Totem Sign
        const totem = new THREE.Mesh(new THREE.BoxGeometry(2.2, 6.5, 0.6), new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          emissive: 0xef4444,
          emissiveIntensity: 0.3,
        }));
        totem.position.set(bWidth / 2 - 1, 3.25, 12);
        bGroup.add(totem);
      }

      root.add(bGroup);

      collisionBoxes.push({
        minX: bx - bWidth / 2,
        maxX: bx + bWidth / 2,
        minZ: bz - bDepth / 2,
        maxZ: bz + bDepth / 2,
        label: `Downtown Building ${i + 1}`,
      });
    });

    // ==========================================
    // 10. STREET FURNITURE, TREES & REALISTIC LIGHTING
    // ==========================================
    // Modern Arched LED Street Lamps
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
    const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0c2, emissiveIntensity: 1.4 });

    const lampPoints: [number, number][] = [
      [15, 15], [-15, 15], [15, -15], [-15, -15],
      [40, 0], [-40, 0], [0, 40], [0, -40],
      [80, 50], [120, 90], [160, 120], [200, 140], [240, 160],
      [-50, 40], [-100, 70], [-150, 110], [-190, 140],
      [80, -40], [140, -90], [200, -130],
      [-40, -80], [-90, -120], [-140, -160]
    ];

    lampPoints.forEach(([lx, lz]) => {
      const ly = getWorldElevation(lx, lz);
      const lampGroup = new THREE.Group();
      lampGroup.position.set(lx, ly, lz);

      // Fluted Base & Vertical Pole
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.8, 8), lampMat);
      base.position.y = 0.4;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.2, 8), lampMat);
      pole.position.y = 3.5;
      lampGroup.add(base, pole);

      // Curved Swan-Neck Cantilever Arm
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8), lampMat);
      neck.rotation.z = Math.PI / 3;
      neck.position.set(0.65, 6.8, 0);
      lampGroup.add(neck);

      // LED Luminaire Head
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.35), lampHeadMat);
      bulb.position.set(1.4, 7.2, 0);
      lampGroup.add(bulb);

      const light = new THREE.PointLight(0xfff0c2, 0, 36);
      light.position.set(1.4, 7.0, 0);
      lampGroup.add(light);
      streetLamps.push(light);

      root.add(lampGroup);
    });

    // Red Cast-Iron Fire Hydrants at Downtown Intersections
    const hydrantMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.6, roughness: 0.3 });
    [
      [14, 12], [-14, 12], [14, -12], [-14, -12],
      [78, 48], [-48, 78], [78, -48]
    ].forEach(([hx, hz]) => {
      const hy = getWorldElevation(hx, hz);
      const hydrant = new THREE.Group();
      hydrant.position.set(hx, hy + 0.1, hz);

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.85, 10), hydrantMat);
      body.position.y = 0.42;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), hydrantMat);
      cap.position.y = 0.88;
      const sideValveL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 8), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 }));
      sideValveL.rotateZ(Math.PI / 2);
      sideValveL.position.set(0, 0.52, 0);
      hydrant.add(body, cap, sideValveL);
      root.add(hydrant);
    });

    // Natural Multi-Cluster Foliage Trees
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const leafyMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 });
    const pineFoliageMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });

    const treePositions: [number, number, boolean][] = [];
    // Mountain Pines
    for (let t = 0; t < 38; t++) {
      treePositions.push([
        pineCenter[0] + (Math.random() - 0.5) * 160,
        pineCenter[1] + (Math.random() - 0.5) * 160,
        true, // isPine
      ]);
    }
    // Lakeside Shoreline Park
    for (let t = 0; t < 22; t++) {
      treePositions.push([
        140 + (Math.random() - 0.5) * 80,
        220 + (Math.random() - 0.5) * 70,
        false, // deciduous leafy
      ]);
    }
    // Downtown Avenues
    for (let t = 0; t < 18; t++) {
      treePositions.push([
        (Math.random() - 0.5) * 130,
        (Math.random() - 0.5) * 130,
        false, // deciduous
      ]);
    }

    treePositions.forEach(([tx, tz, isPine]) => {
      if (Math.hypot(tx - 220, tz - 190) < 85) return; // not in lake

      const ty = getWorldElevation(tx, tz);
      const tree = new THREE.Group();
      tree.position.set(tx, ty, tz);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 3.4, 8), trunkMat);
      trunk.position.y = 1.7;
      trunk.castShadow = true;
      tree.add(trunk);

      if (isPine) {
        // Layered Conifer Pine
        for (let level = 0; level < 3; level++) {
          const cone = new THREE.Mesh(
            new THREE.ConeGeometry(3.2 - level * 0.7, 3.5, 8),
            pineFoliageMat
          );
          cone.position.y = 3.6 + level * 2.2;
          cone.castShadow = true;
          tree.add(cone);
        }
      } else {
        // Deciduous Multi-Lobed Canopy
        const canopyOffsets = [
          [0, 4.2, 0, 2.4],
          [-1.1, 4.6, 0.8, 1.8],
          [1.1, 4.8, -0.6, 1.9],
          [0, 5.6, 0, 1.7],
        ];
        canopyOffsets.forEach(([cx, cy, cz, cr]) => {
          const sphere = new THREE.Mesh(new THREE.SphereGeometry(cr, 8, 8), leafyMat);
          sphere.position.set(cx, cy, cz);
          sphere.castShadow = true;
          tree.add(sphere);
        });
      }

      root.add(tree);
    });

    // ==========================================
    // 11. OBJECTIVE HOLOGRAM MARKER BEACON
    // ==========================================
    const objectiveMarkerGroup = new THREE.Group();

    const diamondMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x4ade80,
      emissiveIntensity: 1.5,
    });
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(2.0, 0), diamondMat);
    diamond.position.y = 4.2;
    objectiveMarkerGroup.add(diamond);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const groundRing = new THREE.Mesh(new THREE.RingGeometry(3.5, 4.2, 32), ringMat);
    groundRing.rotateX(-Math.PI / 2);
    groundRing.position.y = 0.15;
    objectiveMarkerGroup.add(groundRing);

    objectiveMarkerGroup.visible = false;
    root.add(objectiveMarkerGroup);

    return {
      root,
      collisionBoxes,
      streetLamps,
      objectiveMarkerGroup,
      beaconLight,
      trafficLights,
      waterMesh,
      roadMaterials,
      terrainMaterial,
    };
  }

  public static setWeatherTheme(world: BuiltWorld, isSnowy: boolean, isWet: boolean): void {
    if (world.roadMaterials.length > 0) {
      world.roadMaterials.forEach((mat) => {
        if (isSnowy) {
          mat.color.setHex(0xd1d5db);
          mat.roughness = 0.9;
        } else if (isWet) {
          mat.color.setHex(0x0f172a);
          mat.roughness = 0.2;
        } else {
          mat.color.setHex(0x1e293b);
          mat.roughness = 0.75;
        }
      });
    }

    if (world.terrainMaterial) {
      if (isSnowy) {
        world.terrainMaterial.color.setHex(0xe2e8f0);
        world.terrainMaterial.roughness = 0.95;
      } else {
        world.terrainMaterial.color.setHex(0xffffff);
      }
    }
  }
}
