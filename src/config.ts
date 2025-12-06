import { DeviceConfig } from './types.js';
import { API, COLLECTION, FILESYSTEM } from './utils/constants.js';
import { validateConfiguration } from './utils/validation.js';

export interface AppConfig {
  apiUrl: string;
  apiKey: string;
  dataDir: string;
  daysToFetch: number;
  requestDelayMs: number;
}

function resolveDaysToFetch(envValue: string | undefined): number {
  const parsed = envValue ? Number.parseInt(envValue, 10) : Number.NaN;
  if (Number.isFinite(parsed)) {
    return Math.min(Math.max(parsed, COLLECTION.MIN_DAYS_TO_FETCH), COLLECTION.MAX_DAYS_TO_FETCH);
  }
  return COLLECTION.DEFAULT_DAYS_TO_FETCH;
}

function resolveRequestDelay(envValue: string | undefined): number {
  const parsed = envValue ? Number.parseInt(envValue, 10) : Number.NaN;
  if (Number.isFinite(parsed)) {
    return Math.min(
      Math.max(parsed, COLLECTION.MIN_REQUEST_DELAY_MS),
      COLLECTION.MAX_REQUEST_DELAY_MS,
    );
  }
  return COLLECTION.DEFAULT_REQUEST_DELAY_MS;
}

export const devices: DeviceConfig[] = [
  {
    id: '9000008311',
    name: 'Telraam 9000008311',
    location: 'Karlsruhe, Germany',
  },
  {
    id: '9000008322',
    name: 'Telraam 9000008322',
    location: 'Karlsruhe, Germany',
  },
  {
    id: '9000008891',
    name: 'Telraam 9000008891',
    location: 'Karlsruhe, Germany',
  },
];

/**
 * Get configuration from environment
 * This function is called after dotenv.config() to ensure env vars are loaded
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const daysToFetch = resolveDaysToFetch(env.TELRAAM_DAYS_TO_FETCH);
  const requestDelayMs = resolveRequestDelay(env.TELRAAM_REQUEST_DELAY_MS);

  const config: AppConfig = {
    apiUrl: API.BASE_URL,
    apiKey: env.TELRAAM_API_KEY || '',
    // Store under docs so GitHub Pages can serve the JSON output from the default docs root
    dataDir: FILESYSTEM.DATA_DIR,
    daysToFetch,
    requestDelayMs,
  };

  const validation = validateConfiguration({
    apiKey: config.apiKey,
    devices,
    daysToFetch: config.daysToFetch,
  });

  if (!validation.valid) {
    throw new Error(validation.errors.join('; '));
  }

  return config;
}
