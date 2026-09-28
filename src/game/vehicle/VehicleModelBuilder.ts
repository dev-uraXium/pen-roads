import * as THREE from 'three';
import { VehicleConfig, VehicleId } from '../../types/game';

export interface VehicleMeshRig {
  root: THREE.Group;
  chassis: THREE.Group;
  wheels: THREE.Mesh[];
  frontSteerGroups: THREE.Group[];
  bodyMaterials: THREE.MeshStandardMaterial[];
  headlightMesh: THREE.Mesh;
  brakelightMesh: THREE.Mesh;
  headlightSpots: THREE.SpotLight[];
  doorMesh?: THREE.Group; // for bus door animation
  isDoorOpen?: boolean;
  trailerGroup?: THREE.Group; // articulated freight trailer
  trailerWheels?: THREE.Mesh[];
}

export class VehicleModelBuilder {
  public static createVehicle(config: VehicleConfig, customColor?: string): VehicleMeshRig {
    const root = new THREE.Group();
    const chassis = new THREE.Group();
    root.add(chassis);

    const bodyMaterials: THREE.MeshStandardMaterial[] = [];
    const wheels: THREE.Mesh[] = [];
    const frontSteerGroups: THREE.Group[] = [];
    const headlightSpots: THREE.SpotLight[] = [];

    const colorHex = customColor || config.color;
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      metalness: 0.65,
      roughness: 0.28,
    });
    bodyMaterials.push(bodyMat);

    // Shared high-detail materials
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x111c2a,
      metalness: 0.9,
      roughness: 0.05,
      transparent: true,
      opacity: 0.78,
    });

    const interiorMat = new THREE.MeshStandardMaterial({
      color: 0x1e2430,
      roughness: 0.85,
      metalness: 0.1,
    });

    const blackTrimMat = new THREE.MeshStandardMaterial({
      color: 0x181c22,
      roughness: 0.75,
      metalness: 0.25,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.95,
      roughness: 0.1,
    });

    const grillMat = new THREE.MeshStandardMaterial({
      color: 0x0a0c10,
      roughness: 0.9,
      metalness: 0.3,
    });

    const plateMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.5,
      metalness: 0.2,
    });

    // Lights
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff6dd,
      emissiveIntensity: 0.85,
      roughness: 0.1,
      metalness: 0.2,
    });

    const brakelightMat = new THREE.MeshStandardMaterial({
      color: 0x770505,
      emissive: 0xff1515,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.2,
    });

    const turnSignalMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.4,
      roughness: 0.2,
    });

    let headlightMesh: THREE.Mesh;
    let brakelightMesh: THREE.Mesh;
    let doorMesh: THREE.Group | undefined;
    let trailerGroup: THREE.Group | undefined;
    const trailerWheels: THREE.Mesh[] = [];

    // Helper: Build a styled sport/classic wheel assembly
    const createWheel = (radius: number, width: number, isChromeHub: boolean = false, isHeavy: boolean = false): THREE.Mesh => {
      const wheelGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
      wheelGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(wheelGeo, blackTrimMat);
      tire.castShadow = true;

      // Rim outer lip
      const rimRadius = radius * 0.65;
      const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, width + 0.02, 16);
      rimGeo.rotateZ(Math.PI / 2);
      const rimMesh = new THREE.Mesh(rimGeo, isChromeHub ? chromeMat : blackTrimMat);
      tire.add(rimMesh);

      // Inner disc / brake rotor & caliper
      if (!isHeavy) {
        const brakeRotor = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.48, radius * 0.48, width * 0.4, 12), chromeMat);
        brakeRotor.rotateZ(Math.PI / 2);
        tire.add(brakeRotor);

        const caliper = new THREE.Mesh(new THREE.BoxGeometry(width * 0.5, radius * 0.28, radius * 0.18), new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 }));
        caliper.position.set(0, radius * 0.32, 0);
        tire.add(caliper);
      }

      // Wheel Center Spokes / Hub
      if (isChromeHub) {
        const domeGeo = new THREE.SphereGeometry(radius * 0.4, 12, 12);
        domeGeo.scale(1, 0.4, 1);
        domeGeo.rotateZ(Math.PI / 2);
        const domeMesh = new THREE.Mesh(domeGeo, chromeMat);
        domeMesh.position.x = width * 0.48;
        tire.add(domeMesh);
        const domeMeshL = domeMesh.clone();
        domeMeshL.position.x = -width * 0.48;
        tire.add(domeMeshL);
      } else {
        // Multi-spoke alloy
        const spokeCount = isHeavy ? 6 : 5;
        for (let s = 0; s < spokeCount; s++) {
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(width + 0.03, radius * 0.55, 0.05), chromeMat);
          spoke.rotation.x = (s * Math.PI) / (spokeCount / 2);
          tire.add(spoke);
        }
        // Center lug nut plate
        const centerCap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, width + 0.04, 10), blackTrimMat);
        centerCap.rotateZ(Math.PI / 2);
        tire.add(centerCap);
      }

      return tire;
    };

    // Helper: Build a realistic license plate
    const createLicensePlate = (text = 'GRIDLINE'): THREE.Group => {
      const group = new THREE.Group();
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.03), plateMat);
      group.add(plate);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.19, 0.02), blackTrimMat);
      frame.position.z = -0.01;
      group.add(frame);
      return group;
    };

    switch (config.id) {
      // ==========================================
      // 1 & 2. CITY CAR (COMPACT) & TAXI SEDAN
      // ==========================================
      case 'city_car':
      case 'taxi_sedan': {
        const isTaxi = config.id === 'taxi_sedan';
        const length = config.bodyDimensions.length;
        const width = config.bodyDimensions.width;
        const height = config.bodyDimensions.height;

        // --- A. Main Lower Sculpted Body ---
        const mainBody = new THREE.Mesh(new THREE.BoxGeometry(width, 0.55, length * 0.94), bodyMat);
        mainBody.position.y = 0.56;
        mainBody.castShadow = true;
        mainBody.receiveShadow = true;
        chassis.add(mainBody);

        // Lower Rocker Side Skirts (black protection trim)
        const skirtL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, length * 0.88), blackTrimMat);
        skirtL.position.set(-width / 2 + 0.02, 0.32, 0);
        const skirtR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, length * 0.88), blackTrimMat);
        skirtR.position.set(width / 2 - 0.02, 0.32, 0);
        chassis.add(skirtL, skirtR);

        // --- B. Sloped Hood (Bonnet) with Center Crease ---
        const hoodLen = isTaxi ? length * 0.34 : length * 0.28;
        const hoodGeo = new THREE.BoxGeometry(width * 0.92, 0.14, hoodLen);
        const hood = new THREE.Mesh(hoodGeo, bodyMat);
        hood.position.set(0, 0.82, length * 0.25);
        hood.rotation.x = 0.08;
        hood.castShadow = true;
        chassis.add(hood);

        // Hood Center Power Bulge / Crease
        const crease = new THREE.Mesh(new THREE.BoxGeometry(width * 0.28, 0.04, hoodLen * 0.85), bodyMat);
        crease.position.set(0, 0.91, length * 0.25);
        crease.rotation.x = 0.08;
        chassis.add(crease);

        // --- C. Front Bumper Fascia & Radiator Grille ---
        const fFascia = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.38, 0.35), bodyMat);
        fFascia.position.set(0, 0.45, length * 0.48);
        chassis.add(fFascia);

        // Main Grille (Honeycomb Black mesh)
        const grille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.65, 0.22, 0.1), grillMat);
        grille.position.set(0, 0.52, length * 0.5 + 0.01);
        chassis.add(grille);

        // Brand Chrome Logo on Grille
        const logo = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), chromeMat);
        logo.rotateX(Math.PI / 2);
        logo.position.set(0, 0.55, length * 0.505);
        chassis.add(logo);

        // Lower Air Dam Intake & Fog Lights
        const lowerIntake = new THREE.Mesh(new THREE.BoxGeometry(width * 0.76, 0.12, 0.08), blackTrimMat);
        lowerIntake.position.set(0, 0.32, length * 0.5 + 0.01);
        chassis.add(lowerIntake);

        [-1, 1].forEach((side) => {
          const fogHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12), blackTrimMat);
          fogHousing.rotateX(Math.PI / 2);
          fogHousing.position.set(side * (width * 0.38), 0.33, length * 0.495);
          const fogLens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), headlightMat);
          fogLens.rotateX(Math.PI / 2);
          fogHousing.add(fogLens);
          chassis.add(fogHousing);
        });

        // Front License Plate
        const fPlate = createLicensePlate(isTaxi ? 'TX-409' : 'NC-201');
        fPlate.position.set(0, 0.32, length * 0.508);
        chassis.add(fPlate);

        // Taxi Front Push-bar / Bull-bar if Taxi
        if (isTaxi) {
          const bullBarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
          const bar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.28, 0.12), bullBarMat);
          bar.position.set(0, 0.44, length * 0.52);
          chassis.add(bar);
        }

        // --- D. Detailed Headlights (Left & Right Housings) ---
        const hlWidth = width * 0.26;
        const hlHeight = 0.16;
        const hlDepth = 0.18;

        const leftHL = new THREE.Mesh(new THREE.BoxGeometry(hlWidth, hlHeight, hlDepth), headlightMat);
        leftHL.position.set(-width * 0.34, 0.68, length * 0.485);
        leftHL.rotation.y = -0.12;

        const rightHL = new THREE.Mesh(new THREE.BoxGeometry(hlWidth, hlHeight, hlDepth), headlightMat);
        rightHL.position.set(width * 0.34, 0.68, length * 0.485);
        rightHL.rotation.y = 0.12;

        // Front corner amber turn indicators
        [-1, 1].forEach((side) => {
          const turnSig = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.14), turnSignalMat);
          turnSig.position.set(side * (width * 0.47), 0.68, length * 0.47);
          chassis.add(turnSig);
        });

        // Combined Headlight Mesh for emissive controls
        const headlightGroup = new THREE.Group();
        headlightGroup.add(leftHL, rightHL);
        chassis.add(headlightGroup);
        headlightMesh = leftHL; // primary reference

        // --- E. Cabin Greenhouse (A/B/C Pillars & Glass) ---
        const cabinLen = isTaxi ? length * 0.52 : length * 0.48;
        const cabinZ = isTaxi ? -length * 0.04 : -length * 0.08;

        // Raked Windshield
        const winGeo = new THREE.BoxGeometry(width * 0.86, 0.6, 0.08);
        const windshield = new THREE.Mesh(winGeo, glassMat);
        windshield.position.set(0, 1.15, cabinZ + cabinLen * 0.46);
        windshield.rotation.x = 0.42;
        chassis.add(windshield);

        // Windshield Wipers
        [-0.25, 0.2].forEach((wx) => {
          const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.02), blackTrimMat);
          wiper.position.set(wx, 0.94, cabinZ + cabinLen * 0.5);
          wiper.rotation.z = -0.15;
          chassis.add(wiper);
        });

        // Passenger Cabin Glass Enclosure
        const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 0.58, cabinLen), glassMat);
        cabinGlass.position.set(0, 1.14, cabinZ);
        chassis.add(cabinGlass);

        // Structural Roof Top Panel
        const roofPanel = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.08, cabinLen * 0.94), bodyMat);
        roofPanel.position.set(0, 1.44, cabinZ);
        roofPanel.castShadow = true;
        chassis.add(roofPanel);

        // Roof Shark-Fin Radio Antenna
        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), bodyMat);
        fin.position.set(0, 1.5, cabinZ - cabinLen * 0.4);
        fin.rotation.x = -0.25;
        chassis.add(fin);

        // Side Pillars (A & B & C pillars in matte black)
        [-1, 1].forEach((side) => {
          const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.12), blackTrimMat);
          bPillar.position.set(side * (width * 0.425), 1.14, cabinZ);
          chassis.add(bPillar);

          // Aerodynamic Side Mirrors with chrome mirror face
          const mirrorStem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.06), blackTrimMat);
          mirrorStem.position.set(side * (width * 0.44), 0.96, cabinZ + cabinLen * 0.38);
          const mirrorCap = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.12), bodyMat);
          mirrorCap.position.set(side * (width * 0.5 + 0.02), 0.98, cabinZ + cabinLen * 0.38);
          const mirrorFace = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.16), chromeMat);
          mirrorFace.position.set(side * (width * 0.5 + 0.02), 0.98, cabinZ + cabinLen * 0.38 - 0.065);
          mirrorFace.rotation.y = Math.PI;
          chassis.add(mirrorStem, mirrorCap, mirrorFace);

          // Flush Door Handles
          const handle1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.16), blackTrimMat);
          handle1.position.set(side * (width * 0.495), 0.78, cabinZ + cabinLen * 0.2);
          const handle2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.16), blackTrimMat);
          handle2.position.set(side * (width * 0.495), 0.78, cabinZ - cabinLen * 0.18);
          chassis.add(handle1, handle2);
        });

        // Visible Interior Silhouette: Dashboard & Front Bucket Seats
        const dash = new THREE.Mesh(new THREE.BoxGeometry(width * 0.78, 0.24, 0.4), interiorMat);
        dash.position.set(0, 0.9, cabinZ + cabinLen * 0.36);
        const steerWheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 16), blackTrimMat);
        steerWheel.position.set(-0.35, 1.05, cabinZ + cabinLen * 0.22);
        steerWheel.rotation.x = -0.3;
        chassis.add(dash, steerWheel);

        [-0.32, 0.32].forEach((sx) => {
          const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.45), interiorMat);
          seatBase.position.set(sx, 0.65, cabinZ + 0.05);
          const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 0.14), interiorMat);
          seatBack.position.set(sx, 0.98, cabinZ - 0.12);
          seatBack.rotation.x = -0.1;
          const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 0.1), interiorMat);
          headrest.position.set(sx, 1.28, cabinZ - 0.15);
          chassis.add(seatBase, seatBack, headrest);
        });

        // Taxi Fare Meter and Partition Glass if Taxi
        if (isTaxi) {
          const fareMeter = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.08), new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.6,
          }));
          fareMeter.position.set(0.12, 1.05, cabinZ + cabinLen * 0.3);
          chassis.add(fareMeter);

          const partition = new THREE.Mesh(new THREE.BoxGeometry(width * 0.8, 0.5, 0.02), glassMat);
          partition.position.set(0, 1.05, cabinZ - 0.22);
          chassis.add(partition);

          // Illuminated Taxi Roof Sign
          const taxiPod = new THREE.Group();
          taxiPod.position.set(0, 1.56, cabinZ);
          const podBase = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.2, 0.28), new THREE.MeshStandardMaterial({
            color: 0xfef08a,
            emissive: 0xfacc15,
            emissiveIntensity: 0.75,
            roughness: 0.2,
          }));
          taxiPod.add(podBase);
          const podMount = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.18), blackTrimMat);
          podMount.position.y = -0.11;
          taxiPod.add(podMount);
          chassis.add(taxiPod);
        }

        // --- F. Rear End & Hatchback/Trunk Styling ---
        const rFascia = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.42, 0.35), bodyMat);
        rFascia.position.set(0, 0.48, -length * 0.48);
        chassis.add(rFascia);

        // Rear Lower Diffuser & Dual Exhaust
        const diffuser = new THREE.Mesh(new THREE.BoxGeometry(width * 0.8, 0.16, 0.15), blackTrimMat);
        diffuser.position.set(0, 0.32, -length * 0.49);
        chassis.add(diffuser);

        [-0.38, 0.38].forEach((ex) => {
          const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.18, 12), chromeMat);
          exhaust.rotateX(Math.PI / 2);
          exhaust.position.set(ex, 0.32, -length * 0.5 - 0.02);
          chassis.add(exhaust);
        });

        // Rear License Plate with plate light
        const rPlate = createLicensePlate(isTaxi ? 'TX-409' : 'NC-201');
        rPlate.rotation.y = Math.PI;
        rPlate.position.set(0, 0.48, -length * 0.505);
        chassis.add(rPlate);

        // Rear Spoiler Wing for city compact
        if (!isTaxi) {
          const spoiler = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.05, 0.22), bodyMat);
          spoiler.position.set(0, 1.48, -length * 0.36);
          spoiler.rotation.x = -0.1;
          chassis.add(spoiler);
        }

        // Tail Lights (Left & Right Modern LED Clusters)
        const tlWidth = width * 0.28;
        const leftTL = new THREE.Mesh(new THREE.BoxGeometry(tlWidth, 0.18, 0.14), brakelightMat);
        leftTL.position.set(-width * 0.34, 0.72, -length * 0.485);
        const rightTL = new THREE.Mesh(new THREE.BoxGeometry(tlWidth, 0.18, 0.14), brakelightMat);
        rightTL.position.set(width * 0.34, 0.72, -length * 0.485);

        const brakelightGroup = new THREE.Group();
        brakelightGroup.add(leftTL, rightTL);
        chassis.add(brakelightGroup);
        brakelightMesh = leftTL;

        // --- G. Wheels & Suspensions ---
        const wheelRadius = isTaxi ? 0.36 : 0.34;
        const wheelWidth = 0.23;
        const halfW = width * 0.47;
        const halfL = length * 0.31;

        const wheelPositions = [
          { x: -halfW, y: wheelRadius, z: halfL, isFront: true },
          { x: halfW, y: wheelRadius, z: halfL, isFront: true },
          { x: -halfW, y: wheelRadius, z: -halfL, isFront: false },
          { x: halfW, y: wheelRadius, z: -halfL, isFront: false },
        ];

        wheelPositions.forEach((pos) => {
          const wheelM = createWheel(wheelRadius, wheelWidth, isTaxi);
          if (pos.isFront) {
            const steerGroup = new THREE.Group();
            steerGroup.position.set(pos.x, pos.y, pos.z);
            steerGroup.add(wheelM);
            chassis.add(steerGroup);
            frontSteerGroups.push(steerGroup);
          } else {
            wheelM.position.set(pos.x, pos.y, pos.z);
            chassis.add(wheelM);
          }
          wheels.push(wheelM);
        });
        break;
      }

      // ==========================================
      // 3. COURIER HIGH-ROOF DELIVERY VAN
      // ==========================================
      case 'delivery_van': {
        const length = config.bodyDimensions.length;
        const width = config.bodyDimensions.width;
        const height = config.bodyDimensions.height;

        // --- A. Cab & Front End ---
        const frontCab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.85, 1.3), bodyMat);
        frontCab.position.set(0, 0.78, length * 0.36);
        frontCab.castShadow = true;
        chassis.add(frontCab);

        // Slanted Commercial Hood & Grille
        const vanHood = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 0.2, 0.95), bodyMat);
        vanHood.position.set(0, 1.05, length * 0.38);
        vanHood.rotation.x = 0.18;
        chassis.add(vanHood);

        const vanGrille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.32, 0.1), grillMat);
        vanGrille.position.set(0, 0.58, length * 0.49);
        chassis.add(vanGrille);

        const fStep = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.24, 0.28), blackTrimMat);
        fStep.position.set(0, 0.42, length * 0.48);
        chassis.add(fStep);

        const fVanPlate = createLicensePlate('VAN-552');
        fVanPlate.position.set(0, 0.36, length * 0.505);
        chassis.add(fVanPlate);

        // Vertical Euro Van Headlights
        const vhlGeo = new THREE.BoxGeometry(width * 0.22, 0.28, 0.14);
        const lVHL = new THREE.Mesh(vhlGeo, headlightMat);
        lVHL.position.set(-width * 0.36, 0.78, length * 0.47);
        const rVHL = new THREE.Mesh(vhlGeo, headlightMat);
        rVHL.position.set(width * 0.36, 0.78, length * 0.47);
        headlightMesh = lVHL;
        chassis.add(lVHL, rVHL);

        // Windshield
        const vanWin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.75, 0.08), glassMat);
        vanWin.position.set(0, 1.48, length * 0.28);
        vanWin.rotation.x = 0.32;
        chassis.add(vanWin);

        // Commercial Twin-Lens Truck Mirrors
        [-1, 1].forEach((side) => {
          const stem = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.08), blackTrimMat);
          stem.position.set(side * (width * 0.52), 1.35, length * 0.28);
          const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.12), blackTrimMat);
          mirror.position.set(side * (width * 0.58), 1.35, length * 0.28);
          const glassFace = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.32), chromeMat);
          glassFace.rotation.y = Math.PI;
          glassFace.position.set(side * (width * 0.58), 1.35, length * 0.28 - 0.065);
          chassis.add(stem, mirror, glassFace);
        });

        // --- B. High-Roof Cargo Body with Ribs ---
        const cargoBox = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, height * 0.78, length * 0.68), bodyMat);
        cargoBox.position.set(0, height * 0.52, -length * 0.1);
        cargoBox.castShadow = true;
        cargoBox.receiveShadow = true;
        chassis.add(cargoBox);

        // Longitudinal Roof Ribs
        for (let r = -3; r <= 3; r++) {
          const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, length * 0.66), bodyMat);
          rib.position.set(r * 0.25, height * 0.91 + 0.03, -length * 0.1);
          chassis.add(rib);
        }

        // Protective Black Side Rub-Strips along body
        [-1, 1].forEach((side) => {
          const rubStrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, length * 0.88), blackTrimMat);
          rubStrip.position.set(side * (width * 0.515), 0.7, 0);
          chassis.add(rubStrip);
        });

        // Rear Barn Doors (Asymmetrical 60/40 Cargo Doors)
        const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, height * 0.74, 0.08), bodyMat);
        doorFrame.position.set(0, height * 0.52, -length * 0.445);
        chassis.add(doorFrame);

        // Vertical Door Seam & Handles
        const doorSeam = new THREE.Mesh(new THREE.BoxGeometry(0.04, height * 0.72, 0.1), blackTrimMat);
        doorSeam.position.set(0.15, height * 0.52, -length * 0.448);
        const rearHandle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.08), chromeMat);
        rearHandle.position.set(0.24, height * 0.5, -length * 0.455);
        chassis.add(doorSeam, rearHandle);

        // Rear Bumper with Non-Slip Foot Step
        const rVanBumper = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, 0.24, 0.32), blackTrimMat);
        rVanBumper.position.set(0, 0.42, -length * 0.45);
        chassis.add(rVanBumper);

        const rVanPlate = createLicensePlate('VAN-552');
        rVanPlate.rotation.y = Math.PI;
        rVanPlate.position.set(-0.25, 0.55, -length * 0.455);
        chassis.add(rVanPlate);

        // High-Mounted Cargo Taillights
        const tlGeo = new THREE.BoxGeometry(width * 0.18, 0.55, 0.1);
        const lVanTL = new THREE.Mesh(tlGeo, brakelightMat);
        lVanTL.position.set(-width * 0.44, 1.25, -length * 0.45);
        const rVanTL = new THREE.Mesh(tlGeo, brakelightMat);
        rVanTL.position.set(width * 0.44, 1.25, -length * 0.45);
        brakelightMesh = lVanTL;
        chassis.add(lVanTL, rVanTL);

        // Third High Brake Light Bar
        const thirdBrake = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.05), brakelightMat);
        thirdBrake.position.set(0, height * 0.88, -length * 0.45);
        chassis.add(thirdBrake);

        // Visible Interior & Cargo Crates visible through rear glass
        const cargoBox1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.7), new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 }));
        cargoBox1.position.set(-0.35, 0.65, -length * 0.25);
        const cargoBox2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 }));
        cargoBox2.position.set(0.35, 0.6, -length * 0.28);
        chassis.add(cargoBox1, cargoBox2);

        // --- C. Heavy Wheels & Mudflaps ---
        const wheelRadius = 0.42;
        const wheelWidth = 0.28;
        const halfW = width * 0.49;
        const halfL = length * 0.31;

        [
          { x: -halfW, y: wheelRadius, z: halfL, isFront: true },
          { x: halfW, y: wheelRadius, z: halfL, isFront: true },
          { x: -halfW, y: wheelRadius, z: -halfL, isFront: false },
          { x: halfW, y: wheelRadius, z: -halfL, isFront: false },
        ].forEach((pos) => {
          const wheelM = createWheel(wheelRadius, wheelWidth, false, true);
          if (pos.isFront) {
            const steerGroup = new THREE.Group();
            steerGroup.position.set(pos.x, pos.y, pos.z);
            steerGroup.add(wheelM);
            chassis.add(steerGroup);
            frontSteerGroups.push(steerGroup);
          } else {
            wheelM.position.set(pos.x, pos.y, pos.z);
            chassis.add(wheelM);

            // Mudflaps behind rear wheels
            const flap = new THREE.Mesh(new THREE.BoxGeometry(wheelWidth + 0.04, 0.35, 0.04), blackTrimMat);
            flap.position.set(pos.x, 0.35, pos.z - wheelRadius - 0.12);
            chassis.add(flap);
          }
          wheels.push(wheelM);
        });
        break;
      }

      // ==========================================
      // 4. NORTHBRIDGE CITY TRANSIT BUS
      // ==========================================
      case 'city_bus': {
        const length = config.bodyDimensions.length;
        const width = config.bodyDimensions.width;
        const height = config.bodyDimensions.height;

        // --- A. Main Low-Floor Transit Bus Body ---
        const busBody = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.82, length), bodyMat);
        busBody.position.set(0, height * 0.48, 0);
        busBody.castShadow = true;
        busBody.receiveShadow = true;
        chassis.add(busBody);

        // Lower Skirt Panels (Charcoal Grey)
        const busSkirt = new THREE.Mesh(new THREE.BoxGeometry(width + 0.02, 0.35, length * 0.98), blackTrimMat);
        busSkirt.position.set(0, 0.32, 0);
        chassis.add(busSkirt);

        // --- B. Panoramic Tinted Glass Ribbon (Both Flanks) ---
        const windowBand = new THREE.Mesh(new THREE.BoxGeometry(width * 1.01, 1.1, length * 0.86), glassMat);
        windowBand.position.set(0, height * 0.62, -length * 0.02);
        chassis.add(windowBand);

        // Black Window Mullions / Divider Pillars
        for (let w = -4; w <= 4; w++) {
          const mullionL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.1), blackTrimMat);
          mullionL.position.set(-width * 0.508, height * 0.62, w * 0.9);
          const mullionR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.1), blackTrimMat);
          mullionR.position.set(width * 0.508, height * 0.62, w * 0.9);
          chassis.add(mullionL, mullionR);
        }

        // Curved Front Windscreen & Top Marquee
        const frontWin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.95, 1.3, 0.25), glassMat);
        frontWin.position.set(0, height * 0.56, length * 0.5);
        frontWin.rotation.x = -0.12;
        chassis.add(frontWin);

        // Electronic LED Destination Display Board ("101 METRO EXPRESS")
        const marqueeBox = new THREE.Mesh(new THREE.BoxGeometry(width * 0.78, 0.32, 0.15), new THREE.MeshStandardMaterial({
          color: 0x0a0a0a,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.95,
        }));
        marqueeBox.position.set(0, height * 0.84, length * 0.502);
        chassis.add(marqueeBox);

        // Front Fold-Down Bicycle Rack
        const bikeRack = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.35, 0.45), blackTrimMat);
        bikeRack.position.set(0, 0.52, length * 0.525);
        chassis.add(bikeRack);

        // Front Headlights
        const fBusHeadlights = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 0.22, 0.12), headlightMat);
        fBusHeadlights.position.set(0, 0.62, length * 0.506);
        chassis.add(fBusHeadlights);
        headlightMesh = fBusHeadlights;

        // Front Rabbit-Ear Side Mirrors on Tall Stalks
        [-1, 1].forEach((side) => {
          const earStalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), blackTrimMat);
          earStalk.position.set(side * (width * 0.52), height * 0.82, length * 0.48);
          earStalk.rotation.z = side * 0.35;
          const earMirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.1), blackTrimMat);
          earMirror.position.set(side * (width * 0.58), height * 0.82, length * 0.48);
          chassis.add(earStalk, earMirror);
        });

        // --- C. Animated Passenger Doors (Right Side) ---
        doorMesh = new THREE.Group();
        doorMesh.position.set(width * 0.51, height * 0.45, length * 0.28);

        const leaf1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.85, 0.65), glassMat);
        leaf1.position.set(0, 0, -0.34);
        const frame1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.9, 0.08), blackTrimMat);
        frame1.position.set(0, 0, -0.02);
        leaf1.add(frame1);

        const leaf2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.85, 0.65), glassMat);
        leaf2.position.set(0, 0, 0.34);
        const frame2 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.9, 0.08), blackTrimMat);
        frame2.position.set(0, 0, 0.02);
        leaf2.add(frame2);

        doorMesh.add(leaf1, leaf2);
        chassis.add(doorMesh);

        // --- D. Detailed Visible Bus Interior ---
        // Blue Municipal Passenger Seats
        const seatMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.7 });
        const poleMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.6, roughness: 0.3 }); // Yellow transit poles

        for (let row = -3; row <= 2; row++) {
          // Left pair of seats
          const sLeft = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.65, 0.45), seatMat);
          sLeft.position.set(-width * 0.28, 0.72, row * 1.1);
          // Right pair of seats
          const sRight = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.65, 0.45), seatMat);
          sRight.position.set(width * 0.28, 0.72, row * 1.1);
          chassis.add(sLeft, sRight);

          // Vertical Safety Grab Poles along aisle
          const vPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 8), poleMat);
          vPole.position.set(-0.25, 1.45, row * 1.1);
          chassis.add(vPole);
        }

        // Horizontal Ceiling Handrail
        const hRail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, length * 0.75, 8), poleMat);
        hRail.rotateX(Math.PI / 2);
        hRail.position.set(-0.25, 2.3, 0);
        chassis.add(hRail);

        // Driver Cabin Enclosure & Farebox
        const farebox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.85, 0.25), chromeMat);
        farebox.position.set(0.2, 0.9, length * 0.42);
        chassis.add(farebox);

        // --- E. Rooftop HVAC & Escape Pods ---
        const hvacUnit = new THREE.Mesh(new THREE.BoxGeometry(width * 0.75, 0.32, 2.8), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 }));
        hvacUnit.position.set(0, height * 0.94, -0.4);
        chassis.add(hvacUnit);

        [-2.8, 2.2].forEach((hx) => {
          const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.8), blackTrimMat);
          hatch.position.set(0, height * 0.91, hx);
          chassis.add(hatch);
        });

        // --- F. Rear End, Engine Ventilation & Tail Lights ---
        const rGrille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.75, 0.8, 0.08), grillMat);
        rGrille.position.set(0, 0.85, -length * 0.502);
        chassis.add(rGrille);

        const rBusTL = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.4, 0.1), brakelightMat);
        rBusTL.position.set(0, 0.9, -length * 0.505);
        chassis.add(rBusTL);
        brakelightMesh = rBusTL;

        // --- G. 6 Heavy Bus Wheels (Front Axle + Dual Rear Axle) ---
        const wheelRadius = 0.52;
        const wheelWidth = 0.36;
        const halfW = width * 0.48;

        const busWheels = [
          { x: -halfW, y: wheelRadius, z: length * 0.36, isFront: true },
          { x: halfW, y: wheelRadius, z: length * 0.36, isFront: true },
          { x: -halfW, y: wheelRadius, z: -length * 0.25, isFront: false },
          { x: halfW, y: wheelRadius, z: -length * 0.25, isFront: false },
          { x: -halfW, y: wheelRadius, z: -length * 0.38, isFront: false },
          { x: halfW, y: wheelRadius, z: -length * 0.38, isFront: false },
        ];

        busWheels.forEach((pos) => {
          const wheelM = createWheel(wheelRadius, wheelWidth, false, true);
          if (pos.isFront) {
            const steerGroup = new THREE.Group();
            steerGroup.position.set(pos.x, pos.y, pos.z);
            steerGroup.add(wheelM);
            chassis.add(steerGroup);
            frontSteerGroups.push(steerGroup);
          } else {
            wheelM.position.set(pos.x, pos.y, pos.z);
            chassis.add(wheelM);
          }
          wheels.push(wheelM);
        });
        break;
      }

      // ==========================================
      // 5. FREIGHT HAULER TRACTOR CAB + SEMI-TRAILER
      // ==========================================
      case 'box_truck': {
        const width = config.bodyDimensions.width;
        const height = config.bodyDimensions.height;

        // --- 1. TRACTOR CAB UNIT ---
        // Main Sleeper Cab Body
        const cabMesh = new THREE.Mesh(new THREE.BoxGeometry(width * 0.95, 1.85, 2.4), bodyMat);
        cabMesh.position.set(0, 1.55, 0.7);
        cabMesh.castShadow = true;
        cabMesh.receiveShadow = true;
        chassis.add(cabMesh);

        // Aerodynamic High-Rise Wind Deflector with side fairings
        const deflector = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.72, 1.8), bodyMat);
        deflector.position.set(0, 2.65, 0.6);
        deflector.rotation.x = -0.16;
        chassis.add(deflector);

        // Panoramic Split Windshield & Chrome Sun Visor
        const win = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.82, 0.12), glassMat);
        win.position.set(0, 1.95, 1.88);
        chassis.add(win);

        const sunVisor = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.22, 0.4), chromeMat);
        sunVisor.position.set(0, 2.42, 1.95);
        sunVisor.rotation.x = 0.35;
        chassis.add(sunVisor);

        // Amber Cab Clearance Bullet Lights (5 across roof)
        for (let c = -2; c <= 2; c++) {
          const bullet = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8), turnSignalMat);
          bullet.rotateX(Math.PI / 2);
          bullet.position.set(c * 0.35, 2.5, 1.98);
          chassis.add(bullet);
        }

        // Heavy Chrome Radiator Grille & Bumper
        const grill = new THREE.Mesh(new THREE.BoxGeometry(width * 0.8, 1.05, 0.15), chromeMat);
        grill.position.set(0, 1.05, 1.92);
        chassis.add(grill);

        const tBumper = new THREE.Mesh(new THREE.BoxGeometry(width * 1.04, 0.48, 0.35), chromeMat);
        tBumper.position.set(0, 0.55, 1.94);
        chassis.add(tBumper);

        // Dual Chrome Vertical Exhaust Stacks with Curved Tips
        [-1, 1].forEach((side) => {
          const stackPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 12), chromeMat);
          stackPipe.position.set(side * (width * 0.48), 2.25, -0.45);
          const stackTip = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 12), chromeMat);
          stackTip.position.set(side * (width * 0.48), 3.65, -0.55);
          stackTip.rotation.x = -0.35;
          chassis.add(stackPipe, stackTip);

          // Giant Cylindrical Fuel Tanks with Step Plates
          const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.4, 16), chromeMat);
          tank.rotateZ(Math.PI / 2);
          tank.position.set(side * (width * 0.46), 0.58, 0.15);
          const tankSteps = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 1.1), blackTrimMat);
          tankSteps.position.set(side * (width * 0.52), 0.95, 0.15);
          chassis.add(tank, tankSteps);

          // Chrome Air Horns on Roof
          const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 8), chromeMat);
          horn.rotateX(Math.PI / 2);
          horn.position.set(side * (width * 0.35), 2.6, 1.4);
          chassis.add(horn);
        });

        // Fifth Wheel Coupling Turntable & Diamond Deck Plate
        const deckPlate = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.1, 1.8), blackTrimMat);
        deckPlate.position.set(0, 0.78, -0.8);
        const fifthWheelPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.14, 20), blackTrimMat);
        fifthWheelPlate.position.set(0, 0.92, -1.0);
        chassis.add(deckPlate, fifthWheelPlate);

        // Headlights & Tail Warning Lights
        const tHL = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.24, 0.12), headlightMat);
        tHL.position.set(0, 0.82, 1.93);
        chassis.add(tHL);
        headlightMesh = tHL;

        const tBL = new THREE.Mesh(new THREE.BoxGeometry(width * 0.8, 0.2, 0.1), brakelightMat);
        tBL.position.set(0, 0.7, -1.5);
        chassis.add(tBL);
        brakelightMesh = tBL;

        // Tractor Wheels
        const wheelRadius = 0.52;
        const wheelWidth = 0.35;
        const halfW = width * 0.48;

        const cabWheels = [
          { x: -halfW, y: wheelRadius, z: 1.15, isFront: true },
          { x: halfW, y: wheelRadius, z: 1.15, isFront: true },
          { x: -halfW, y: wheelRadius, z: -0.9, isFront: false },
          { x: halfW, y: wheelRadius, z: -0.9, isFront: false },
        ];

        cabWheels.forEach((pos) => {
          const wheelM = createWheel(wheelRadius, wheelWidth, true, true);
          if (pos.isFront) {
            const steerGroup = new THREE.Group();
            steerGroup.position.set(pos.x, pos.y, pos.z);
            steerGroup.add(wheelM);
            chassis.add(steerGroup);
            frontSteerGroups.push(steerGroup);
          } else {
            wheelM.position.set(pos.x, pos.y, pos.z);
            chassis.add(wheelM);
          }
          wheels.push(wheelM);
        });

        // --- 2. ARTICULATED FREIGHT SEMI-TRAILER ---
        const tGroup = new THREE.Group();
        trailerGroup = tGroup;
        tGroup.position.set(0, 0, -1.0);
        root.add(tGroup);

        const trailerMat = new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          metalness: 0.35,
          roughness: 0.4,
        });
        bodyMaterials.push(trailerMat);

        // Refrigeration / Nose Unit (Thermo King style front reefer)
        const reeferUnit = new THREE.Mesh(new THREE.BoxGeometry(width * 0.75, 1.2, 0.45), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 }));
        reeferUnit.position.set(0, 2.3, 0.35);
        tGroup.add(reeferUnit);

        // Main Heavy Freight Box Container with Corrugated Texture Ribs
        const container = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, height * 0.82, 5.8), trailerMat);
        container.position.set(0, 2.05, -2.5);
        container.castShadow = true;
        container.receiveShadow = true;
        tGroup.add(container);

        // Longitudinal Ribs / Trim Along Top & Bottom
        const topRailL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 5.8), chromeMat);
        topRailL.position.set(-width * 0.515, height * 0.82 + 0.95, -2.5);
        const topRailR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 5.8), chromeMat);
        topRailR.position.set(width * 0.515, height * 0.82 + 0.95, -2.5);
        tGroup.add(topRailL, topRailR);

        // Side Underrun Safety Guardrails (Between landing gear and wheels)
        [-1, 1].forEach((side) => {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 2.6), chromeMat);
          rail.position.set(side * (width * 0.51), 0.72, -1.8);
          tGroup.add(rail);

          // Landing Gear Jacks
          const jackLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), blackTrimMat);
          jackLeg.position.set(side * (width * 0.4), 0.5, -0.6);
          const jackFoot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.3), blackTrimMat);
          jackFoot.position.set(side * (width * 0.4), 0.1, -0.6);
          tGroup.add(jackLeg, jackFoot);
        });

        // Rear Double Cargo Swing Doors with 4 Cam-Lock Rods
        [-0.45, -0.15, 0.15, 0.45].forEach((rx) => {
          const camRod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 8), chromeMat);
          camRod.position.set(rx, 2.05, -5.42);
          tGroup.add(camRod);
        });

        // Rear Impact Underrun Bumper & DOT Reflective Chevrons
        const iccBumper = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, 0.22, 0.18), chromeMat);
        iccBumper.position.set(0, 0.65, -5.42);
        tGroup.add(iccBumper);

        const trailerLights = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.16, 0.1), brakelightMat);
        trailerLights.position.set(0, 0.82, -5.43);
        tGroup.add(trailerLights);

        // Tandem Rear Dual Wheels (4 wheels per side = 8 total)
        const trailerAxlePositions = [
          { x: -halfW, z: -3.8 },
          { x: halfW, z: -3.8 },
          { x: -halfW, z: -4.75 },
          { x: halfW, z: -4.75 },
        ];

        trailerAxlePositions.forEach((pos) => {
          const tWheel = createWheel(wheelRadius, wheelWidth, true, true);
          tWheel.position.set(pos.x, wheelRadius, pos.z);
          tGroup.add(tWheel);
          trailerWheels.push(tWheel);
        });
        break;
      }

      // ==========================================
      // 6. APEX STREET COURIER MOTORBIKE
      // ==========================================
      case 'motorbike': {
        const length = config.bodyDimensions.length;

        // --- A. Exposed Trellis Frame & 4-Cylinder Engine ---
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 });
        const engineMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.35 });

        // Trellis structural bars
        const trellis = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.55, length * 0.55), frameMat);
        trellis.position.set(0, 0.68, 0);
        chassis.add(trellis);

        // Detailed Engine Block with Cooling Fins
        const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.5), engineMat);
        engineBlock.position.set(0, 0.48, 0.05);
        chassis.add(engineBlock);

        // Polished Engine Covers (Clutch & Alternator)
        [-1, 1].forEach((side) => {
          const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16), chromeMat);
          cover.rotateZ(Math.PI / 2);
          cover.position.set(side * 0.22, 0.46, 0.05);
          chassis.add(cover);
        });

        // 4 Chrome Exhaust Header Pipes into 4-into-1 Collector & Muffler
        const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.65, 12), chromeMat);
        muffler.rotateX(Math.PI / 2.3);
        muffler.position.set(0.24, 0.45, -0.65);
        chassis.add(muffler);

        // --- B. Sculpted Fuel Tank & Sharp Cockpit ---
        const tank = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.72), bodyMat);
        tank.position.set(0, 0.95, 0.18);
        tank.castShadow = true;
        chassis.add(tank);

        // Chrome Aircraft Fuel Filler Cap
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), chromeMat);
        cap.position.set(0, 1.15, 0.25);
        chassis.add(cap);

        // Wide Sport Handlebars with Levers & Bar-End Mirrors
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 12), chromeMat);
        bar.rotateZ(Math.PI / 2);
        bar.position.set(0, 1.12, 0.52);
        chassis.add(bar);

        [-0.42, 0.42].forEach((bx) => {
          const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 12), blackTrimMat);
          grip.rotateZ(Math.PI / 2);
          grip.position.set(bx, 1.12, 0.52);
          const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.08), blackTrimMat);
          mirror.position.set(bx + Math.sign(bx) * 0.08, 1.18, 0.52);
          chassis.add(grip, mirror);
        });

        // Digital TFT Cockpit Display Screen
        const dashScreen = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.04), new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.8,
        }));
        dashScreen.position.set(0, 1.15, 0.42);
        dashScreen.rotation.x = -0.4;
        chassis.add(dashScreen);

        // Aggressive Twin-Projector Headlight Cowl
        const headCowl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.22), bodyMat);
        headCowl.position.set(0, 0.95, 0.68);
        const lHLLens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 16), headlightMat);
        lHLLens.rotateX(Math.PI / 2);
        lHLLens.position.set(-0.08, 0.95, 0.76);
        const rHLLens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 16), headlightMat);
        rHLLens.rotateX(Math.PI / 2);
        rHLLens.position.set(0.08, 0.95, 0.76);
        headlightMesh = lHLLens;
        chassis.add(headCowl, lHLLens, rHLLens);

        // Inverted Gold Telescopic Front Forks
        const forkMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.9, roughness: 0.2 });
        [-0.14, 0.14].forEach((fx) => {
          const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.85, 12), forkMat);
          fork.position.set(fx, 0.75, 0.62);
          fork.rotation.x = 0.35;
          chassis.add(fork);
        });

        // --- C. Stepped Rider Saddle & Sharp Tail Section ---
        const riderSeat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.42), blackTrimMat);
        riderSeat.position.set(0, 0.88, -0.22);
        const pillionSeat = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.35), blackTrimMat);
        pillionSeat.position.set(0, 0.98, -0.52);
        chassis.add(riderSeat, pillionSeat);

        // Sharp Aero Tail Cowl
        const tailCowl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.45), bodyMat);
        tailCowl.position.set(0, 0.94, -0.65);
        chassis.add(tailCowl);

        // Minimalist Tail Light & Fender Tidy
        const bikeTL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.06), brakelightMat);
        bikeTL.position.set(0, 0.92, -0.9);
        chassis.add(bikeTL);
        brakelightMesh = bikeTL;

        // Courier Insulated Hot-Food Delivery Box
        const courierBox = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.48), new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          roughness: 0.6,
        }));
        courierBox.position.set(0, 1.25, -0.65);
        const straps = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), blackTrimMat);
        straps.position.set(0, 1.25, -0.65);
        courierBox.add(straps);
        chassis.add(courierBox);

        // --- D. Lightweight Sport Wheels with Dual Front Brake Discs ---
        const wheelRadius = 0.38;
        const wheelWidth = 0.18;

        [
          { x: 0, y: wheelRadius, z: length * 0.42, isFront: true },
          { x: 0, y: wheelRadius, z: -length * 0.42, isFront: false },
        ].forEach((pos) => {
          const wheelM = createWheel(wheelRadius, wheelWidth, false, false);
          if (pos.isFront) {
            const steerGroup = new THREE.Group();
            steerGroup.position.set(pos.x, pos.y, pos.z);
            steerGroup.add(wheelM);
            chassis.add(steerGroup);
            frontSteerGroups.push(steerGroup);
          } else {
            wheelM.position.set(pos.x, pos.y, pos.z);
            chassis.add(wheelM);

            // Rear Aluminum Swingarm & Mono-shock Spring
            const swingarm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.65), chromeMat);
            swingarm.position.set(0, 0.45, -0.4);
            const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.32, 12), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
            spring.position.set(0, 0.65, -0.25);
            spring.rotation.x = 0.4;
            chassis.add(swingarm, spring);
          }
          wheels.push(wheelM);
        });
        break;
      }

      // ==========================================
      // 7. WANDERER SCENIC CAMPER VAN
      // ==========================================
      case 'camper_van': {
        const { width, length } = config.bodyDimensions;
        const creamMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.35 });
        const canvasMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85 });
        const woodTrimMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 });

        // Two-Tone Lower Body in custom retro paint
        const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(width, 0.95, length), bodyMat);
        lowerBody.position.y = 0.78;
        lowerBody.castShadow = true;
        chassis.add(lowerBody);

        // Chrome Beltline Trim separating paint zones
        const beltline = new THREE.Mesh(new THREE.BoxGeometry(width + 0.03, 0.06, length + 0.03), chromeMat);
        beltline.position.y = 1.25;
        chassis.add(beltline);

        // Upper Retro Cream Cabin
        const upperCabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.9, length * 0.88), creamMat);
        upperCabin.position.set(0, 1.62, -0.15);
        upperCabin.castShadow = true;
        chassis.add(upperCabin);

        // Iconic Front V-Panel with Oversized Chrome Badge
        const vPanel = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.65, 3), creamMat);
        vPanel.position.set(0, 0.88, length * 0.505);
        vPanel.rotation.z = Math.PI;
        const retroBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 24), chromeMat);
        retroBadge.rotateX(Math.PI / 2);
        retroBadge.position.set(0, 0.88, length * 0.515);
        chassis.add(vPanel, retroBadge);

        // Pop-Up Canvas Roof Tent
        const popUpRoof = new THREE.Group();
        popUpRoof.position.set(0, 2.05, -0.2);

        const tent = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.6, length * 0.65), canvasMat);
        tent.position.set(0, 0.28, 0);
        popUpRoof.add(tent);

        const lid = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.14, length * 0.72), creamMat);
        lid.position.set(0, 0.62, 0);
        lid.rotation.x = -0.06;
        popUpRoof.add(lid);
        chassis.add(popUpRoof);

        // Rooftop Tubular Safari Rack with Wooden Trunks & Spare Tire
        const rackGroup = new THREE.Group();
        rackGroup.position.set(0, 2.15, 1.35);
        const rackBars = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.16, 1.25), chromeMat);
        rackGroup.add(rackBars);

        const vintageTrunk = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.38, 0.95), woodTrimMat);
        vintageTrunk.position.set(-0.35, 0.28, 0);
        rackGroup.add(vintageTrunk);

        const coveredSpare = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.24, 20), blackTrimMat);
        coveredSpare.position.set(0.4, 0.24, 0);
        rackGroup.add(coveredSpare);
        chassis.add(rackGroup);

        // Vintage Split Curved Windshield
        const windshield = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.68, 0.1), glassMat);
        windshield.position.set(0, 1.65, length * 0.44 - 0.04);
        windshield.rotation.x = 0.18;
        chassis.add(windshield);

        // Chrome Wrap-Around Bumpers with Overriders
        const fBump = new THREE.Mesh(new THREE.BoxGeometry(width * 1.04, 0.2, 0.25), chromeMat);
        fBump.position.set(0, 0.48, length * 0.51);
        chassis.add(fBump);

        const rBump = new THREE.Mesh(new THREE.BoxGeometry(width * 1.04, 0.2, 0.25), chromeMat);
        rBump.position.set(0, 0.48, -length * 0.51);
        chassis.add(rBump);

        // Vintage Round Chrome Headlights
        const hlCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.09, 20), headlightMat);
        hlCyl.rotateX(Math.PI / 2);
        hlCyl.position.set(-width * 0.35, 0.88, length * 0.505);
        const rightHL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.09, 20), headlightMat);
        rightHL.rotateX(Math.PI / 2);
        rightHL.position.set(width * 0.35, 0.88, length * 0.505);
        headlightMesh = hlCyl;
        chassis.add(hlCyl, rightHL);

        // Classic Oval Taillights
        const leftBrake = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.1), brakelightMat);
        leftBrake.position.set(-width * 0.42, 0.88, -length * 0.505);
        const rightBrake = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.1), brakelightMat);
        rightBrake.position.set(width * 0.42, 0.88, -length * 0.505);
        brakelightMesh = leftBrake;
        chassis.add(leftBrake, rightBrake);

        // 4 Vintage Cream Steel Wheels with Chrome Baby-Moon Hubcaps
        const wheelRadius = 0.4;
        const wheelWidth = 0.25;

        [
          { x: -width * 0.46, y: wheelRadius, z: length * 0.32, isFront: true },
          { x: width * 0.46, y: wheelRadius, z: length * 0.32, isFront: true },
          { x: -width * 0.46, y: wheelRadius, z: -length * 0.32, isFront: false },
          { x: width * 0.46, y: wheelRadius, z: -length * 0.32, isFront: false },
        ].forEach((pos) => {
          const wheelM = createWheel(wheelRadius, wheelWidth, true, false);
          if (pos.isFront) {
            const steerGroup = new THREE.Group();
            steerGroup.position.set(pos.x, pos.y, pos.z);
            steerGroup.add(wheelM);
            chassis.add(steerGroup);
            frontSteerGroups.push(steerGroup);
          } else {
            wheelM.position.set(pos.x, pos.y, pos.z);
            chassis.add(wheelM);
          }
          wheels.push(wheelM);
        });
        break;
      }
    }

    // Forward Realistic Spotlights (Focused Driving Beam)
    const spotLeft = new THREE.SpotLight(0xfff6dd, 2.2, 75, Math.PI / 5.5, 0.3, 1.2);
    spotLeft.position.set(-config.bodyDimensions.width * 0.35, 0.8, config.bodyDimensions.length * 0.5);
    const targetLeft = new THREE.Object3D();
    targetLeft.position.set(-config.bodyDimensions.width * 0.35, 0.2, config.bodyDimensions.length * 0.5 + 25);
    chassis.add(spotLeft);
    chassis.add(targetLeft);
    spotLeft.target = targetLeft;
    headlightSpots.push(spotLeft);

    const spotRight = new THREE.SpotLight(0xfff6dd, 2.2, 75, Math.PI / 5.5, 0.3, 1.2);
    spotRight.position.set(config.bodyDimensions.width * 0.35, 0.8, config.bodyDimensions.length * 0.5);
    const targetRight = new THREE.Object3D();
    targetRight.position.set(config.bodyDimensions.width * 0.35, 0.2, config.bodyDimensions.length * 0.5 + 25);
    chassis.add(spotRight);
    chassis.add(targetRight);
    spotRight.target = targetRight;
    headlightSpots.push(spotRight);

    return {
      root,
      chassis,
      wheels,
      frontSteerGroups,
      bodyMaterials,
      headlightMesh,
      brakelightMesh,
      headlightSpots,
      doorMesh,
      isDoorOpen: false,
      trailerGroup,
      trailerWheels: trailerWheels.length > 0 ? trailerWheels : undefined,
    };
  }

  public static updatePaintColor(rig: VehicleMeshRig, hexColor: string): void {
    const col = new THREE.Color(hexColor);
    rig.bodyMaterials.forEach((mat) => {
      mat.color.copy(col);
    });
  }

  public static setHeadlights(rig: VehicleMeshRig, enabled: boolean): void {
    const emissiveVal = enabled ? 1.6 : 0.25;
    (rig.headlightMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = emissiveVal;
    rig.headlightSpots.forEach((spot) => {
      spot.intensity = enabled ? 2.5 : 0;
    });
  }

  public static setBraking(rig: VehicleMeshRig, isBraking: boolean): void {
    const emissiveVal = isBraking ? 1.8 : 0.35;
    (rig.brakelightMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = emissiveVal;
  }

  public static toggleBusDoors(rig: VehicleMeshRig, open: boolean): void {
    if (!rig.doorMesh) return;
    rig.isDoorOpen = open;
    // Slide door outward/inward
    rig.doorMesh.position.x = open ? 1.42 : 1.24;
  }
}
