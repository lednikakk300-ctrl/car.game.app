export interface CarConfig {
  id: string;
  name: string;
  fullName: string;
  category: string;
  price: number;
  color: string;
  unlocked: boolean;
  stats: {
    topSpeed: number;     // km/h (e.g. 180 to 320)
    acceleration: number; // 0-100 in sec (lower is faster, scale 1-10)
    handling: number;     // 1-10
    braking: number;      // 1-10
    nitro: number;        // 1-10
  };
  upgrades: {
    engine: number; // 0-3
    tires: number;  // 0-3
    nitro: number;  // 0-3
    brakes: number; // 0-3
  };
  description: string;
}

export interface PlayerProfile {
  name: string;
  credits: number; // UZS (Uzbekistani Som / in-game credits)
  selectedCarId: string;
  cars: Record<string, CarConfig>;
  records: Record<string, number>; // routeId -> bestTimeMs
  settings: {
    soundVolume: number;
    musicVolume: number;
    controls: 'buttons' | 'wheel';
    graphicsQuality: 'high' | 'medium' | 'low';
    timeOfDay: 'day' | 'night' | 'sunset';
    weather: 'clear' | 'rain';
    cameraMode: 'chase' | 'cockpit' | 'hood';
  };
}

export const INITIAL_CARS: CarConfig[] = [
  {
    id: 'samara_gt',
    name: 'Samara 2109 GT',
    fullName: 'Lada Samara 2109 GT Turbo',
    category: 'Street Tuner',
    price: 0,
    color: '#dc2626', // Vibrant Red with dual white stripes as in reference
    unlocked: true,
    stats: {
      topSpeed: 210,
      acceleration: 7.2,
      handling: 7.8,
      braking: 7.0,
      nitro: 8.0,
    },
    upgrades: { engine: 0, tires: 0, nitro: 0, brakes: 0 },
    description: 'The legendary Tashkent street racing hatch. Lightweight, agile, and beloved by night street racers.',
  },
  {
    id: 'cobalt_rs',
    name: 'Cobalt RS Turbo',
    fullName: 'Tashkent Cobalt RS 1.5T',
    category: 'Urban Sport',
    price: 35000,
    color: '#2563eb', // Royal Blue
    unlocked: false,
    stats: {
      topSpeed: 235,
      acceleration: 8.2,
      handling: 8.0,
      braking: 7.8,
      nitro: 8.2,
    },
    upgrades: { engine: 0, tires: 0, nitro: 0, brakes: 0 },
    description: 'The king of Tashkent city boulevards. Excellent balance of top speed, drift control, and acceleration.',
  },
  {
    id: 'gwagon_black',
    name: 'G-Black 63 AMG',
    fullName: 'Geländewagen V8 Black Series',
    category: 'Luxury Beast',
    price: 85000,
    color: '#171717', // Matte Black from reference image #4
    unlocked: false,
    stats: {
      topSpeed: 260,
      acceleration: 9.0,
      handling: 7.2,
      braking: 8.5,
      nitro: 8.8,
    },
    upgrades: { engine: 0, tires: 0, nitro: 0, brakes: 0 },
    description: 'Imposing matte black V8 SUV. Heavy, unshakeable on corners, and roars like thunder along Navoiy Avenue.',
  },
  {
    id: 'lacetti_sport',
    name: 'Lacetti Street King',
    fullName: 'Lacetti 1.8 DOHC Touring',
    category: 'Pro Tuner',
    price: 55000,
    color: '#059669', // Emerald Racing Green
    unlocked: false,
    stats: {
      topSpeed: 245,
      acceleration: 8.5,
      handling: 8.6,
      braking: 8.2,
      nitro: 8.5,
    },
    upgrades: { engine: 0, tires: 0, nitro: 0, brakes: 0 },
    description: 'Custom aerokit, racing exhaust, and race-tuned suspension. Highly responsive around tight Tashkent roundabouts.',
  },
  {
    id: 'phantom_supercar',
    name: 'Navoi Phantom GT',
    fullName: 'Phantom GT-V10 Hypercar',
    category: 'Hypercar',
    price: 150000,
    color: '#f59e0b', // Silk Road Golden Amber
    unlocked: false,
    stats: {
      topSpeed: 310,
      acceleration: 9.8,
      handling: 9.2,
      braking: 9.4,
      nitro: 9.5,
    },
    upgrades: { engine: 0, tires: 0, nitro: 0, brakes: 0 },
    description: 'Ultra-aerodynamic carbon-fiber hypercar designed for blistering high-speed showdowns on Amir Timur highway.',
  },
];

const STORAGE_KEY = 'tashkent_street_racer_v1';

export class SaveManager {
  static loadProfile(): PlayerProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Ensure all cars are merged with current schema
        const mergedCars: Record<string, CarConfig> = {};
        for (const car of INITIAL_CARS) {
          if (parsed.cars && parsed.cars[car.id]) {
            mergedCars[car.id] = { ...car, ...parsed.cars[car.id] };
          } else {
            mergedCars[car.id] = { ...car };
          }
        }
        return {
          name: parsed.name || 'TashkentRacer',
          credits: typeof parsed.credits === 'number' ? parsed.credits : 15000,
          selectedCarId: parsed.selectedCarId || 'samara_gt',
          cars: mergedCars,
          records: parsed.records || {},
          settings: {
            soundVolume: 0.8,
            musicVolume: 0.6,
            controls: 'buttons',
            graphicsQuality: 'high',
            timeOfDay: 'day',
            weather: 'clear',
            cameraMode: 'chase',
            ...parsed.settings,
          },
        };
      }
    } catch {
      // Fallback
    }

    const defaultCars: Record<string, CarConfig> = {};
    INITIAL_CARS.forEach((c) => (defaultCars[c.id] = { ...c }));

    return {
      name: 'TashkentRacer',
      credits: 20000,
      selectedCarId: 'samara_gt',
      cars: defaultCars,
      records: {},
      settings: {
        soundVolume: 0.8,
        musicVolume: 0.6,
        controls: 'buttons',
        graphicsQuality: 'high',
        timeOfDay: 'day',
        weather: 'clear',
        cameraMode: 'chase',
      },
    };
  }

  static saveProfile(profile: PlayerProfile): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn('Failed to save profile to localStorage:', e);
    }
  }

  static addCredits(amount: number): PlayerProfile {
    const profile = this.loadProfile();
    profile.credits += amount;
    this.saveProfile(profile);
    return profile;
  }

  static unlockCar(carId: string): { success: boolean; profile: PlayerProfile; message?: string } {
    const profile = this.loadProfile();
    const car = profile.cars[carId];
    if (!car) return { success: false, profile, message: 'Car not found' };
    if (car.unlocked) return { success: true, profile };
    if (profile.credits < car.price) {
      return { success: false, profile, message: 'Not enough credits!' };
    }

    profile.credits -= car.price;
    car.unlocked = true;
    profile.selectedCarId = carId;
    this.saveProfile(profile);
    return { success: true, profile };
  }

  static upgradeCar(
    carId: string,
    part: 'engine' | 'tires' | 'nitro' | 'brakes'
  ): { success: boolean; profile: PlayerProfile; message?: string } {
    const profile = this.loadProfile();
    const car = profile.cars[carId];
    if (!car) return { success: false, profile, message: 'Car not found' };
    const currentLvl = car.upgrades[part];
    if (currentLvl >= 3) return { success: false, profile, message: 'Max upgrade reached!' };

    const cost = (currentLvl + 1) * 8000;
    if (profile.credits < cost) return { success: false, profile, message: 'Not enough credits!' };

    profile.credits -= cost;
    car.upgrades[part] += 1;
    this.saveProfile(profile);
    return { success: true, profile };
  }

  static updateCarColor(carId: string, color: string): PlayerProfile {
    const profile = this.loadProfile();
    if (profile.cars[carId]) {
      profile.cars[carId].color = color;
      this.saveProfile(profile);
    }
    return profile;
  }
}
