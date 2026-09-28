import * as THREE from 'three';
import { BusPassenger, DeliveryParcel, JobDefinition, JobResult, JobType, ReverseParkingBay, VehicleId, WeatherId } from '../../types/game';
import { soundSynth } from '../audio/SoundSynthesizer';
import { BUS_STOPS } from '../world/DistrictData';
import { getWorldElevation } from '../world/WorldElevation';

export const AVAILABLE_JOBS: JobDefinition[] = [
  // 1. CAR — Taxi / Rideshare: Accept fare -> pickup -> comfort meter & dialogue -> dropoff -> tip multiplier
  {
    id: 'taxi_central_to_lakeside',
    title: 'Metro Cab: Executive Transfer to Lakeside',
    type: 'passenger',
    districtFrom: 'central_square',
    districtTo: 'lakeside_highway',
    vehicleRequirement: ['city_car', 'taxi_sedan'],
    baseReward: 290,
    pickupPos: [-20, getWorldElevation(-20, 10), 10],
    dropoffPos: [210, getWorldElevation(210, 190), 190],
    targetName: 'Lakeside Grand Hotel & Marina',
    passengerComfort: 100,
    passengerDialogue: {
      text: 'Heading to Lakeside Hotel! Please take it easy on the curves.',
      mood: 'happy',
      timestamp: Date.now(),
    },
    weatherBonusPct: 20,
  },

  // 2. BUS — Public Transit: Route mode -> scheduled stops -> door operation -> ticket checking mini-game -> on-time bonus
  {
    id: 'bus_route_line1',
    title: 'Line 1: Northbridge Civic & Waterfront Transit',
    type: 'bus_route',
    districtFrom: 'central_square',
    districtTo: 'lakeside_highway',
    vehicleRequirement: ['city_bus'],
    baseReward: 460,
    pickupPos: [15, getWorldElevation(15, 25), 25],
    dropoffPos: [180, getWorldElevation(180, 160), 160],
    targetName: 'Line 1 Waterfront Terminal',
    busStops: [
      BUS_STOPS[0], // Central Terminal
      BUS_STOPS[1], // Clock Tower Plaza
      BUS_STOPS[2], // Old Town Market
      BUS_STOPS[3], // Lakeside Marina Pier
    ],
    currentBusStopIndex: 0,
    ticketsSold: 0,
    dodgersCaught: 0,
    legScheduleSeconds: 65,
    legTimeRemaining: 65,
    weatherBonusPct: 15,
  },

  // 3. TRUCK — Freight Haul: Heavy cargo haul -> articulated trailer -> cargo condition % -> reverse-parking docking bay
  {
    id: 'truck_heavy_freight',
    title: 'Heavy Logistics: Industrial Crane Haul',
    type: 'cargo',
    districtFrom: 'industrial_yard',
    districtTo: 'pine_ridge',
    vehicleRequirement: ['box_truck'],
    baseReward: 580,
    pickupPos: [220, getWorldElevation(220, -140), -140],
    dropoffPos: [-200, getWorldElevation(-200, -180), -180],
    targetName: 'Pine Ridge Mountain Depot',
    cargoHealth: 100,
    parkingBay: {
      position: [-200, getWorldElevation(-200, -180), -180],
      rotationY: Math.PI,
      width: 3.8,
      length: 8.5,
      isAligned: false,
      distanceToCenter: 999,
    },
    weatherBonusPct: 35,
  },

  // 4. VAN — Multi-Stop Parcel Delivery: 4 parcels loaded -> deliver in any order -> fragile flag -> waypoint manifest UI
  {
    id: 'van_multistop_delivery',
    title: 'Express Courier: 4-Stop District Parcel Run',
    type: 'cargo',
    districtFrom: 'industrial_yard',
    districtTo: 'old_town',
    vehicleRequirement: ['delivery_van', 'box_truck', 'camper_van'],
    baseReward: 420,
    pickupPos: [160, getWorldElevation(160, -100), -100],
    dropoffPos: [-195, getWorldElevation(-195, 150), 150],
    targetName: 'District Parcel Delivery',
    cargoHealth: 100,
    timeLimitSeconds: 240,
    elapsedSeconds: 0,
    activeParcelIndex: 0,
    parcels: [
      {
        id: 'parcel_1',
        name: 'Artisan Pastry Crates ⚠️',
        destinationName: 'Old Town Heritage Bakery',
        position: [-195, getWorldElevation(-195, 150), 150],
        district: 'old_town',
        isFragile: true,
        delivered: false,
        condition: 100,
      },
      {
        id: 'parcel_2',
        name: 'Municipal Records Archive',
        destinationName: 'Central Clock Tower Plaza',
        position: [-25, getWorldElevation(-25, -20), -20],
        district: 'central_square',
        isFragile: false,
        delivered: false,
        condition: 100,
      },
      {
        id: 'parcel_3',
        name: 'Precision Marina Radar Unit ⚠️',
        destinationName: 'Lakeside Marina Pier',
        position: [180, getWorldElevation(180, 160), 160],
        district: 'lakeside_highway',
        isFragile: true,
        delivered: false,
        condition: 100,
      },
      {
        id: 'parcel_4',
        name: 'Summit Observatory Optics',
        destinationName: 'Pine Ridge Alpine Lodge',
        position: [-200, getWorldElevation(-200, -180), -180],
        district: 'pine_ridge',
        isFragile: false,
        delivered: false,
        condition: 100,
      },
    ],
    weatherBonusPct: 25,
  },

  // 5. BIKE — Courier Urgent Sprint: Point A to B -> near-miss bonuses for weaving -> tight time limit
  {
    id: 'bike_urgent_courier',
    title: 'Hot Dispatch: Urgent Legal Document Sprint',
    type: 'courier',
    districtFrom: 'old_town',
    districtTo: 'central_square',
    vehicleRequirement: ['motorbike', 'city_car'],
    baseReward: 340,
    pickupPos: [-180, getWorldElevation(-180, 130), 130],
    dropoffPos: [30, getWorldElevation(30, -30), -30],
    targetName: 'Northbridge Civic Chambers',
    timeLimitSeconds: 120,
    elapsedSeconds: 0,
    nearMissCount: 0,
    nearMissMultiplier: 1,
    weatherBonusPct: 20,
  },

  // 6. CAMPER VAN — Scenic Exploration Tour
  {
    id: 'camper_scenic_tour',
    title: 'Wanderer Tour: Pine Ridge Vista Expedition',
    type: 'passenger',
    districtFrom: 'central_square',
    districtTo: 'pine_ridge',
    vehicleRequirement: ['camper_van', 'city_car', 'taxi_sedan'],
    baseReward: 380,
    pickupPos: [0, getWorldElevation(0, 0), 0],
    dropoffPos: [-230, getWorldElevation(-230, -220), -220],
    targetName: 'Pine Ridge Summit Vista',
    passengerComfort: 100,
    passengerDialogue: {
      text: 'Looking forward to the summit views! Let us take the mountain switchbacks smoothly.',
      mood: 'happy',
      timestamp: Date.now(),
    },
    weatherBonusPct: 30,
  },
];

export class JobSystem {
  public activeJob: JobDefinition | null = null;
  public jobStage: 'none' | 'goto_pickup' | 'in_transit' | 'bus_at_stop' | 'bus_checking_tickets' | 'completed' = 'none';

  // Bus route state
  public busDoorsOpen: boolean = false;
  public passengerQueue: BusPassenger[] = [];
  public currentPassengerIndex: number = 0;

  // Collision impacts & near miss tracker
  public collisionCount: number = 0;
  public nearMissPoints: number = 0;
  public precisionParked: boolean = false;

  public selectJob(jobId: string): JobDefinition | null {
    const template = AVAILABLE_JOBS.find((j) => j.id === jobId) || AVAILABLE_JOBS[0];
    this.activeJob = JSON.parse(JSON.stringify(template));
    this.jobStage = 'goto_pickup';
    this.collisionCount = 0;
    this.nearMissPoints = 0;
    this.busDoorsOpen = false;
    this.precisionParked = false;

    if (this.activeJob?.type === 'bus_route' && this.activeJob.busStops) {
      this.activeJob.currentBusStopIndex = 0;
      this.activeJob.ticketsSold = 0;
      this.activeJob.dodgersCaught = 0;
      this.activeJob.legTimeRemaining = this.activeJob.legScheduleSeconds || 65;
    }

    if (this.activeJob?.parcels) {
      this.activeJob.activeParcelIndex = 0;
    }

    return this.activeJob;
  }

  public cancelJob(): void {
    this.activeJob = null;
    this.jobStage = 'none';
    this.busDoorsOpen = false;
  }

  public selectParcel(index: number): void {
    if (!this.activeJob || !this.activeJob.parcels || !this.activeJob.parcels[index]) return;
    this.activeJob.activeParcelIndex = index;
  }

  public getTargetPosition(): [number, number, number] | null {
    if (!this.activeJob) return null;

    // Bus Route: current stop
    if (this.activeJob.type === 'bus_route' && this.activeJob.busStops) {
      const stop = this.activeJob.busStops[this.activeJob.currentBusStopIndex || 0];
      return stop ? stop.position : null;
    }

    // Pickup stage
    if (this.jobStage === 'goto_pickup') {
      return this.activeJob.pickupPos;
    }

    // Van Multi-stop parcel stage
    if (this.jobStage === 'in_transit' && this.activeJob.parcels) {
      const idx = this.activeJob.activeParcelIndex || 0;
      const parcel = this.activeJob.parcels[idx];
      if (parcel && !parcel.delivered) {
        return parcel.position;
      }
      // Find first undelivered parcel
      const undelivered = this.activeJob.parcels.find((p) => !p.delivered);
      return undelivered ? undelivered.position : this.activeJob.dropoffPos;
    }

    // Single Dropoff stage
    if (this.jobStage === 'in_transit') {
      return this.activeJob.dropoffPos;
    }

    return null;
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    isStationary: boolean,
    vehicleRotationY: number = 0
  ): {
    canInteract: boolean;
    promptText: string;
    isComplete: boolean;
    result?: JobResult;
  } {
    if (!this.activeJob) {
      return { canInteract: false, promptText: '', isComplete: false };
    }

    if (this.activeJob.elapsedSeconds !== undefined) {
      this.activeJob.elapsedSeconds += delta;
    }

    // Bus leg schedule countdown
    if (this.activeJob.type === 'bus_route' && this.activeJob.legTimeRemaining !== undefined && !this.busDoorsOpen) {
      this.activeJob.legTimeRemaining = Math.max(0, this.activeJob.legTimeRemaining - delta);
    }

    const target = this.getTargetPosition();
    if (!target) {
      return { canInteract: false, promptText: '', isComplete: false };
    }

    const dist = Math.hypot(playerPos.x - target[0], playerPos.z - target[2]);
    const inZone = dist < 7.5;

    // 1. BUS ROUTE
    if (this.activeJob.type === 'bus_route' && this.activeJob.busStops) {
      const currentStop = this.activeJob.busStops[this.activeJob.currentBusStopIndex || 0];

      if (inZone && isStationary) {
        if (!this.busDoorsOpen) {
          return {
            canInteract: true,
            promptText: `Open Doors at ${currentStop.name} [E]`,
            isComplete: false,
          };
        } else if (this.currentPassengerIndex < this.passengerQueue.length) {
          const pass = this.passengerQueue[this.currentPassengerIndex];
          return {
            canInteract: true,
            promptText: `Check Passenger: ${pass.name} [E]`,
            isComplete: false,
          };
        } else {
          return {
            canInteract: true,
            promptText: 'Close Doors & Continue Route [E]',
            isComplete: false,
          };
        }
      } else {
        const onTimeText = this.activeJob.legTimeRemaining && this.activeJob.legTimeRemaining > 0 ? ` (${Math.round(this.activeJob.legTimeRemaining)}s on-time)` : '';
        return {
          canInteract: false,
          promptText: `Route: ${currentStop.name}${onTimeText}`,
          isComplete: false,
        };
      }
    }

    // 2. GOTO PICKUP (Car, Van, Truck, Courier)
    if (this.jobStage === 'goto_pickup') {
      if (inZone && isStationary) {
        const actionLabel =
          this.activeJob.type === 'passenger'
            ? 'Pick Up Passenger [E]'
            : this.activeJob.type === 'cargo' && this.activeJob.parcels
            ? 'Load 4 Delivery Parcels [E]'
            : this.activeJob.type === 'cargo'
            ? 'Couple Freight Trailer [E]'
            : 'Accept Dispatch Package [E]';

        return {
          canInteract: true,
          promptText: actionLabel,
          isComplete: false,
        };
      }
      return {
        canInteract: false,
        promptText: `Proceed to Pickup: ${this.activeJob.districtFrom.replace('_', ' ')}`,
        isComplete: false,
      };
    }

    // 3. IN TRANSIT — VAN MULTI-STOP DELIVERY
    if (this.jobStage === 'in_transit' && this.activeJob.parcels) {
      const activeIdx = this.activeJob.activeParcelIndex || 0;
      const parcel = this.activeJob.parcels[activeIdx];

      if (parcel && !parcel.delivered) {
        const pDist = Math.hypot(playerPos.x - parcel.position[0], playerPos.z - parcel.position[2]);
        if (pDist < 7.5 && isStationary) {
          return {
            canInteract: true,
            promptText: `Deliver: ${parcel.name} at ${parcel.destinationName} [E]`,
            isComplete: false,
          };
        }
        return {
          canInteract: false,
          promptText: `Deliver ${parcel.name} to ${parcel.destinationName}`,
          isComplete: false,
        };
      }
    }

    // 4. IN TRANSIT — TRUCK REVERSE-PARKING BAY
    if (this.jobStage === 'in_transit' && this.activeJob.parkingBay) {
      const bay = this.activeJob.parkingBay;
      const bDist = Math.hypot(playerPos.x - bay.position[0], playerPos.z - bay.position[2]);
      bay.distanceToCenter = bDist;

      // Heading difference to reverse parking orientation
      let headingDiff = Math.abs(vehicleRotationY - bay.rotationY);
      while (headingDiff > Math.PI) headingDiff = Math.abs(headingDiff - Math.PI * 2);
      const isReverseAligned = headingDiff < 0.45; // within ~25 degrees of bay angle
      bay.isAligned = isReverseAligned && bDist < 4.5;

      if (inZone && isStationary) {
        if (bay.isAligned) {
          this.precisionParked = true;
          return {
            canInteract: true,
            promptText: 'Docked in Bay! Unload Freight Trailer [E]',
            isComplete: false,
          };
        } else {
          return {
            canInteract: true,
            promptText: bDist < 4.0 ? 'Unload Freight (Align in Yellow Bay for +$150 Bonus) [E]' : 'Reverse into Loading Bay',
            isComplete: false,
          };
        }
      }
      return {
        canInteract: false,
        promptText: `Haul Freight to ${this.activeJob.targetName}`,
        isComplete: false,
      };
    }

    // 5. STANDARD IN TRANSIT DROP-OFF (Taxi / Courier)
    if (this.jobStage === 'in_transit') {
      if (inZone && isStationary) {
        const actionLabel =
          this.activeJob.type === 'passenger'
            ? 'Disembark Passenger & Collect Fare [E]'
            : 'Deliver Dispatch & Collect Payment [E]';

        return {
          canInteract: true,
          promptText: actionLabel,
          isComplete: false,
        };
      }
      return {
        canInteract: false,
        promptText: `Destination: ${this.activeJob.targetName}`,
        isComplete: false,
      };
    }

    return { canInteract: false, promptText: '', isComplete: false };
  }

  public handleInteract(weatherId: WeatherId): { isComplete: boolean; result?: JobResult } {
    if (!this.activeJob) return { isComplete: false };

    // 1. Bus Route Interaction
    if (this.activeJob.type === 'bus_route' && this.activeJob.busStops) {
      if (!this.busDoorsOpen) {
        // Open pneumatic doors
        this.busDoorsOpen = true;
        soundSynth.playBusDoors(true);

        // Generate boarding passengers for this stop
        this.passengerQueue = this.generatePassengerQueue();
        this.currentPassengerIndex = 0;
        return { isComplete: false };
      } else if (this.currentPassengerIndex < this.passengerQueue.length) {
        // Automatically accept valid ticket or process via quick E
        const pass = this.passengerQueue[this.currentPassengerIndex];
        this.inspectPassengerTicket(pass.isValid);
        return { isComplete: false };
      } else {
        // Close doors and advance stop
        this.busDoorsOpen = false;
        soundSynth.playBusDoors(false);
        const nextIndex = (this.activeJob.currentBusStopIndex || 0) + 1;

        if (nextIndex >= this.activeJob.busStops.length) {
          // Finished full route!
          const result = this.calculatePayout(weatherId);
          this.activeJob = null;
          this.jobStage = 'completed';
          soundSynth.playJobRewardFanfare();
          return { isComplete: true, result };
        } else {
          this.activeJob.currentBusStopIndex = nextIndex;
          this.activeJob.legTimeRemaining = this.activeJob.legScheduleSeconds || 65;
          return { isComplete: false };
        }
      }
    }

    // 2. Pickup Stage
    if (this.jobStage === 'goto_pickup') {
      this.jobStage = 'in_transit';

      if (this.activeJob.type === 'passenger') {
        soundSynth.playPassengerBoarded();
        soundSynth.playPassengerSpeech('happy');
        this.activeJob.passengerDialogue = {
          text: `Thanks for the pickup! Taking us to ${this.activeJob.targetName}.`,
          mood: 'happy',
          timestamp: Date.now(),
        };
      } else {
        soundSynth.playCargoAction();
      }
      return { isComplete: false };
    }

    // 3. Van Multi-Stop Delivery
    if (this.jobStage === 'in_transit' && this.activeJob.parcels) {
      const activeIdx = this.activeJob.activeParcelIndex || 0;
      const parcel = this.activeJob.parcels[activeIdx];

      if (parcel && !parcel.delivered) {
        parcel.delivered = true;
        soundSynth.playCargoAction();

        // Check if all parcels delivered
        const allDelivered = this.activeJob.parcels.every((p) => p.delivered);
        if (allDelivered) {
          const result = this.calculatePayout(weatherId);
          this.activeJob = null;
          this.jobStage = 'completed';
          soundSynth.playJobRewardFanfare();
          return { isComplete: true, result };
        } else {
          // Select next undelivered parcel
          const nextIdx = this.activeJob.parcels.findIndex((p) => !p.delivered);
          if (nextIdx !== -1) {
            this.activeJob.activeParcelIndex = nextIdx;
          }
          return { isComplete: false };
        }
      }
    }

    // 4. Dropoff Stage (Car, Truck, Courier)
    if (this.jobStage === 'in_transit') {
      const result = this.calculatePayout(weatherId);
      this.activeJob = null;
      this.jobStage = 'completed';
      soundSynth.playJobRewardFanfare();
      return { isComplete: true, result };
    }

    return { isComplete: false };
  }

  // Bus passenger ticket check action
  public inspectPassengerTicket(accept: boolean): { isLegFinished: boolean; message: string; caughtDodger: boolean } {
    if (!this.activeJob || this.currentPassengerIndex >= this.passengerQueue.length) {
      return { isLegFinished: true, message: 'All passengers boarded.', caughtDodger: false };
    }

    const passenger = this.passengerQueue[this.currentPassengerIndex];
    let message = '';
    let caughtDodger = false;

    if (passenger.isValid) {
      if (accept) {
        passenger.status = 'accepted';
        this.activeJob.ticketsSold = (this.activeJob.ticketsSold || 0) + 1;
        soundSynth.playTicketValid();
        message = `Accepted valid pass from ${passenger.name}`;
      } else {
        passenger.status = 'rejected';
        message = `Warning: Mistakenly questioned valid pass from ${passenger.name}`;
      }
    } else {
      // Fare dodger
      if (!accept) {
        passenger.status = 'rejected';
        this.activeJob.dodgersCaught = (this.activeJob.dodgersCaught || 0) + 1;
        caughtDodger = true;
        soundSynth.playTicketDodgerCaught();
        message = `Caught Fare Dodger! ${passenger.name} had an invalid pass (+$50 Fine Bonus)`;
      } else {
        passenger.status = 'accepted';
        message = `Missed Fare Dodger! Allowed ${passenger.name} with invalid pass aboard.`;
      }
    }

    this.currentPassengerIndex++;
    const isLegFinished = this.currentPassengerIndex >= this.passengerQueue.length;
    return { isLegFinished, message, caughtDodger };
  }

  private generatePassengerQueue(): BusPassenger[] {
    const names = ['Alice Cooper', 'Devon Vance', 'Maya Lin', 'Arthur Pendelton', 'Sofia Gomez', 'Kenji Sato', 'Emma Watson', 'Marcus Brody'];
    const validTickets = ['Standard Metro Single Pass', 'Monthly Student Transit Card', 'Senior Citizen All-Zone Pass', 'Day Tourist Passport'];
    const invalidTickets = ['Expired Yesterday Single Ticket', 'Photocopied Student ID', 'Forged Transfer Slip', 'Invalid Zone Fare'];

    const count = 2 + Math.floor(Math.random() * 2); // 2 or 3 passengers per stop
    const queue: BusPassenger[] = [];

    for (let i = 0; i < count; i++) {
      const name = names[Math.floor(Math.random() * names.length)];
      // ~25% chance of fare dodger
      const isDodger = Math.random() < 0.25;
      queue.push({
        id: `pass_${Date.now()}_${i}`,
        name,
        ticketType: isDodger ? invalidTickets[Math.floor(Math.random() * invalidTickets.length)] : validTickets[Math.floor(Math.random() * validTickets.length)],
        isValid: !isDodger,
        status: 'pending',
      });
    }

    return queue;
  }

  public registerNearMiss(bonus: number): void {
    if (!this.activeJob) return;
    this.nearMissPoints += bonus;
    if (this.activeJob.nearMissCount !== undefined) {
      this.activeJob.nearMissCount++;
    }
  }

  public registerCollision(speed: number): void {
    if (!this.activeJob) return;
    this.collisionCount++;

    const penalty = Math.round(speed * 1.5);

    // Drain passenger comfort
    if (this.activeJob.passengerComfort !== undefined) {
      this.activeJob.passengerComfort = Math.max(10, this.activeJob.passengerComfort - penalty);
      this.activeJob.passengerDialogue = {
        text: 'Ouch! Please watch where you are driving!',
        mood: 'panicked',
        timestamp: Date.now(),
      };
    }

    // Damage cargo health
    if (this.activeJob.cargoHealth !== undefined) {
      this.activeJob.cargoHealth = Math.max(10, this.activeJob.cargoHealth - penalty * 1.2);
    }

    // Damage individual parcels
    if (this.activeJob.parcels) {
      this.activeJob.parcels.forEach((p) => {
        if (!p.delivered) {
          const dmg = p.isFragile ? penalty * 2.2 : penalty;
          p.condition = Math.max(0, p.condition - Math.round(dmg));
        }
      });
    }
  }

  public calculatePayout(weatherId: WeatherId): JobResult {
    if (!this.activeJob) {
      throw new Error('No active job to calculate payout');
    }

    const baseReward = this.activeJob.baseReward;

    // Safety & Comfort Bonus
    let safetyScore = 1.0;
    let specialBonusName: string | undefined;
    let specialBonusAmount: number | undefined;

    if (this.activeJob.passengerComfort !== undefined) {
      safetyScore = this.activeJob.passengerComfort / 100;
      if (this.activeJob.passengerComfort >= 85) {
        specialBonusName = 'Generous Passenger Tip (Smooth Ride)';
        specialBonusAmount = Math.round(baseReward * 0.45);
      }
    } else if (this.activeJob.cargoHealth !== undefined) {
      safetyScore = this.activeJob.cargoHealth / 100;
      if (this.precisionParked) {
        specialBonusName = 'Precision Reverse Docking Bonus';
        specialBonusAmount = 150;
      }
    } else {
      safetyScore = Math.max(0.4, 1 - this.collisionCount * 0.15);
    }

    const safetyBonus = Math.round(baseReward * 0.3 * safetyScore);

    // Weather bonus (rain/snow/storm payout multipliers)
    const weatherMult = weatherId === 'storm_night' ? 0.45 : weatherId === 'snowy' ? 0.35 : weatherId === 'rainy' ? 0.2 : weatherId === 'clear_night' ? 0.15 : 0.05;
    const weatherBonus = Math.round(baseReward * weatherMult);

    // Penalties from crashes
    const penalties = Math.round(this.collisionCount * 18);

    // Bus Dodger fines bonus
    let busDodgerBonus = 0;
    if (this.activeJob.dodgersCaught && this.activeJob.dodgersCaught > 0) {
      busDodgerBonus = this.activeJob.dodgersCaught * 50;
      if (!specialBonusName) {
        specialBonusName = `Fare Enforcement (${this.activeJob.dodgersCaught} Dodgers Caught)`;
        specialBonusAmount = busDodgerBonus;
      }
    }

    // Bike near-miss bonus
    if (this.nearMissPoints > 0) {
      specialBonusName = 'High-Speed Traffic Weaving Bonus';
      specialBonusAmount = this.nearMissPoints;
    }

    const extraBonus = (specialBonusAmount || 0);
    const finalReward = Math.max(60, baseReward + safetyBonus + weatherBonus + extraBonus - penalties);
    const reputationGained = Math.round(finalReward * 0.4);

    const elapsed = Math.round(this.activeJob.elapsedSeconds || 50);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const timeTakenFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    return {
      job: this.activeJob,
      success: true,
      baseReward,
      safetyBonus,
      weatherBonus,
      penalties,
      finalReward,
      reputationGained,
      timeTakenFormatted,
      specialBonusName,
      specialBonusAmount,
    };
  }
}
