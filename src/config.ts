function readEnvString(key: keyof ImportMetaEnv): string | undefined {
  const value = import.meta.env[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readEnvNumber(
  key: keyof ImportMetaEnv,
  fallback: number,
  options: { min?: number; max?: number } = {}
): number {
  const raw = readEnvString(key);
  if (!raw) return fallback;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`[Config] ${key} must be a number. Received "${raw}".`);
  }

  if (options.min !== undefined && parsed < options.min) {
    throw new Error(`[Config] ${key} must be >= ${options.min}. Received ${parsed}.`);
  }

  if (options.max !== undefined && parsed > options.max) {
    throw new Error(`[Config] ${key} must be <= ${options.max}. Received ${parsed}.`);
  }

  return parsed;
}

function readEnvBoolean(key: keyof ImportMetaEnv, fallback: boolean): boolean {
  const raw = readEnvString(key);
  if (!raw) return fallback;

  const normalized = raw.toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;

  throw new Error(`[Config] ${key} must be true/false. Received "${raw}".`);
}

function readEnvEndpoint(key: keyof ImportMetaEnv, fallback: string): string {
  const raw = readEnvString(key);
  if (!raw) return fallback;
  return raw.startsWith('/') ? raw : `/${raw}`;
}

const streamerbotHost = readEnvString('VITE_STREAMERBOT_HOST') ?? '127.0.0.1';
const streamerbotPort = readEnvNumber('VITE_STREAMERBOT_PORT', 8080, { min: 1, max: 65535 });
const streamerbotEndpoint = readEnvEndpoint('VITE_STREAMERBOT_ENDPOINT', '/');
const streamerbotBroadcasterName = readEnvString('VITE_STREAMERBOT_BROADCASTER_NAME') ?? 'Melty1000';

const maxFPS = readEnvNumber('VITE_MAX_FPS', 60, { min: 1, max: 240 });
const enableDebugUI = readEnvBoolean('VITE_ENABLE_DEBUG_UI', import.meta.env.DEV);

export const config = {
  streamerbot: {
    host: streamerbotHost,
    port: streamerbotPort,
    endpoint: streamerbotEndpoint,
    broadcasterName: streamerbotBroadcasterName,
  },

  debug: {
    enableUI: enableDebugUI,
  },

  maxFPS,

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
    // Organic sway animation
    swaySpeed: 0.05,
    swayAmount: 0, // Disabled global rocking
    helixAmplitude: 12, // Independent strand separation

    branchesPerSide: 6,
    branchLength: 40,
    // Leaves on main vine
    leafCount: 15,
    leafSize: 12,
    // Tendrils
    tendrilCount: 10,
    // Intertwining strands
    strandCount: 2,
    intertwineAmplitude: 10,
    intertwineFrequency: 60, // Much tighter braiding
    thornChance: 0.6,
    thornSize: 6,
    growthThreshold: 2,
    minSpacing: 0.012, // ~12px spacing - Fits ~166 entities total
    attachmentSteps: 600, // Higher resolution for dense clusters
    crownExclusionZone: 0.01,
    flowersPerStep: 6,
    growthPerStep: 0.12,
  },

  flower: {
    // Fixed size per milestone stage
    // Crown = 14 at full openness. Radiant should be ~85% of crown.
    // drawSeed uses size*0.5, drawBud/Rose uses size*(0.4+openness*0.6)
    sizes: {
      seed: 9, // 9 * 0.5 = 4.5px radius
      bud: 20, // 20 * 0.52 = ~10px (openness=0.2) - visible difference from seed
      blooming: 12, // 12 * 0.76 = ~9px (openness=0.6)
      fullBloom: 11, // 11 * 1.0 = 11px (openness=1.0)
      megaBloom: 11.5,
      radiant: 11.5, // Match megaBloom size
    },
    growthDuration: 1000,
    sparkleChance: 0.3,
    zombieTimeout: 3600, // 1 hour
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

export type Config = typeof config;
