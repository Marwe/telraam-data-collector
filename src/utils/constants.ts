/**
 * Application Constants
 *
 * Centralized location for all magic values, configuration defaults,
 * and application-wide constants.
 */

/**
 * API Configuration
 */
export const API = {
  /** Default Telraam API URL */
  BASE_URL: 'https://telraam-api.net',

  /** API request timeout in milliseconds */
  TIMEOUT: 30_000,

  /** Endpoints */
  ENDPOINTS: {
    TRAFFIC: '/v1/reports/traffic',
    INSTANCES: '/v1/instances',
  },

  /** Request parameters */
  PARAMS: {
    LEVEL: 'segments' as const,
    FORMAT: 'per-hour' as const,
  },
} as const;

/**
 * File System Configuration
 */
export const FILESYSTEM = {
  /** Default data directory */
  DATA_DIR: './docs/data',

  /** Device metadata filename */
  DEVICES_FILE: 'devices.json',

  /** Device directory prefix */
  DEVICE_DIR_PREFIX: 'device_',

  /** File encoding */
  ENCODING: 'utf-8' as const,

  /** JSON indentation */
  JSON_INDENT: 2,
} as const;

/**
 * Data Collection Configuration
 */
export const COLLECTION = {
  /** Default number of days to fetch */
  DEFAULT_DAYS_TO_FETCH: 31,

  /** Minimum days to fetch */
  MIN_DAYS_TO_FETCH: 1,

  /** Maximum days to fetch (API limit: 3 months) */
  MAX_DAYS_TO_FETCH: 90,
} as const;

/**
 * Date/Time Formats
 */
export const DATETIME = {
  /** ISO date format for API */
  API_FORMAT: 'YYYY-MM-DD HH:MM:SSZ',

  /** Month format for file names */
  MONTH_FORMAT: 'YYYY-MM',

  /** ISO timestamp format */
  ISO_FORMAT: 'ISO8601',
} as const;

/**
 * Error Messages
 */
export const ERRORS = {
  /** Configuration errors */
  CONFIG: {
    MISSING_API_KEY:
      'TELRAAM_API_KEY environment variable is not set. Please set it in your .env file or environment.',
    NO_DEVICES: 'No devices configured. Please add devices to src/config.ts',
    INVALID_DAYS: 'daysToFetch must be greater than 0',
  },

  /** API errors */
  API: {
    NO_RESPONSE: 'No response received from Telraam API',
    NETWORK_ERROR: 'Network error: Unable to reach Telraam API',
    INVALID_RESPONSE: 'Invalid response from API',
  },

  /** Storage errors */
  STORAGE: {
    CREATE_DIR_FAILED: 'Failed to create directory',
    SAVE_FAILED: 'Failed to save data',
    LOAD_FAILED: 'Failed to load data',
  },
} as const;

/**
 * Success Messages
 */
export const MESSAGES = {
  COLLECTION_STARTED: 'Starting data collection',
  COLLECTION_COMPLETE: 'Collection completed successfully!',
  FETCHING_DATA: 'Fetching data for device',
  SAVED_DATA: 'Saved data for device',
  NO_DATA_RETURNED: 'No data returned for device',
} as const;

/**
 * Log Namespaces
 */
export const LOG_NAMESPACES = {
  CLIENT: 'TelraamClient',
  STORAGE: 'Storage',
  COLLECTOR: 'Collector',
  MAIN: 'Main',
} as const;

/**
 * Environment Variables
 */
export const ENV = {
  API_KEY: 'TELRAAM_API_KEY',
  NODE_ENV: 'NODE_ENV',
  LOG_LEVEL: 'LOG_LEVEL',
} as const;

/**
 * Exit Codes
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
  CONFIG_ERROR: 2,
} as const;
