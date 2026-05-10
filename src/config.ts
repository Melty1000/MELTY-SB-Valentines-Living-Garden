export const config = {
  streamerbot: {
    host: '127.0.0.1',
    port: 8080,
    endpoint: '/',
  },

  milestones: {
    bud: 5,
    bloom: 15,
    full: 30,
  },

  giftBombThreshold: 5,

  vine: {
    thickness: 12,
    branchThickness: 6,
    // MUCH slower, subtle animation
    swaySpeed: 0.08,
    swayAmount: 3,
    branchesPerSide: 6,
    branchLength: 60,
    // Leaves on main vine
    leafCount: 20,
    leafSize: 18,
    // Tendrils
    tendrilCount: 12,
  },

  flower: {
    minSize: 15,
    maxSize: 30,
    growthDuration: 1000,
    sparkleChance: 0.3,
  },

  heart: {
    size: 25,
    glowIntensity: 0.3,
    floatSpeed: 0.5,
    floatAmount: 2,
  },

  particles: {
    sparkleCount: 20,
    heartCount: 10,
    lifetime: 2000,
  },

  dance: {
    duration: 5000,
    intensity: 0.8,
    bounceSpeed: 4,
  },

  wind: {
    baseSpeed: 0.0005,
    gustChance: 0.002,
    gustDuration: 3000,
    gustIntensity: 1,
  },
};

export type Config = typeof config;
