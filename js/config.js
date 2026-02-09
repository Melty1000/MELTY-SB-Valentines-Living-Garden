export const config = {
  streamerbot: {
    host: '127.0.0.1',
    port: 8080,
    endpoint: '/',
    broadcasterName: 'Melty1000',
  },

  maxFPS: 60,

  milestones: {
    bud: 5,
    bloom: 15,
    full: 30,
    mega: 50,
    radiant: 100,
  },

  giftBombThreshold: 5,

  vine: {
    thickness: 5,
    defaultGrowth: 0.1,
    maxGrowth: 3.2,
    branchThickness: 4,
    swaySpeed: 0.05,
    swayAmount: 0,
    helixAmplitude: 12,
    branchesPerSide: 6,
    branchLength: 40,
    leafCount: 15,
    leafSize: 12,
    tendrilCount: 10,
    strandCount: 2,
    intertwineAmplitude: 10,
    intertwineFrequency: 60,
    thornChance: 0.6,
    thornSize: 6,
    growthThreshold: 2,
    minSpacing: 0.012,
    attachmentSteps: 600,
    crownExclusionZone: 0.01,
    flowersPerStep: 6,
    growthPerStep: 0.12,
  },

  flower: {
    sizes: {
      seed: 9,
      bud: 20,
      blooming: 12,
      fullBloom: 11,
      megaBloom: 11.5,
      radiant: 11.5,
    },
    growthDuration: 1000,
    sparkleChance: 0.3,
    zombieTimeout: 3600,
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
    lifetime: 2.0,
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
