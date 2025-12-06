/**
 * Validation Utilities
 *
 * Runtime validation functions for configuration and data.
 */

import type { DeviceConfig } from '../types.js';
import { COLLECTION, ERRORS } from './constants.js';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate API key
 */
export function validateApiKey(apiKey: string | undefined): ValidationResult {
  const errors: string[] = [];

  if (!apiKey || apiKey.trim() === '') {
    errors.push(ERRORS.CONFIG.MISSING_API_KEY);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate device configuration
 */
export function validateDevices(devices: DeviceConfig[]): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(devices) || devices.length === 0) {
    errors.push(ERRORS.CONFIG.NO_DEVICES);
    return { valid: false, errors };
  }

  devices.forEach((device, index) => {
    if (!device.id || device.id.trim() === '') {
      errors.push(`Device at index ${index}: id is required`);
    }

    if (!device.name || device.name.trim() === '') {
      errors.push(`Device at index ${index}: name is required`);
    }

    if (!device.location || device.location.trim() === '') {
      errors.push(`Device at index ${index}: location is required`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate days to fetch
 */
export function validateDaysToFetch(days: number): ValidationResult {
  const errors: string[] = [];

  if (!Number.isInteger(days) || days < COLLECTION.MIN_DAYS_TO_FETCH) {
    errors.push(ERRORS.CONFIG.INVALID_DAYS);
  }

  if (days > COLLECTION.MAX_DAYS_TO_FETCH) {
    errors.push(`daysToFetch cannot exceed ${COLLECTION.MAX_DAYS_TO_FETCH} (API limit: 3 months)`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate entire configuration
 */
export function validateConfiguration(config: {
  apiKey: string | undefined;
  devices: DeviceConfig[];
  daysToFetch: number;
}): ValidationResult {
  const results = [
    validateApiKey(config.apiKey),
    validateDevices(config.devices),
    validateDaysToFetch(config.daysToFetch),
  ];

  const allErrors = results.flatMap((r) => r.errors);

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Type guard for checking if value is defined
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/**
 * Type guard for checking if error is a filesystem error
 */
export function isFileSystemError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}

/**
 * Assert that a condition is true, throw error otherwise
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}
