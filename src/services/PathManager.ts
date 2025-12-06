/**
 * Path Manager Service
 *
 * Centralized path construction and management for all file operations.
 * Provides type-safe path utilities and consistent directory structure.
 */

import path from 'path';
import { FILESYSTEM } from '../utils/constants.js';

/**
 * Manages all file system path construction for the application
 */
export class PathManager {
  constructor(private readonly dataDir: string) {}

  /**
   * Get the device directory path
   */
  getDeviceDirectory(deviceId: string): string {
    return path.join(this.dataDir, `${FILESYSTEM.DEVICE_DIR_PREFIX}${deviceId}`);
  }

  /**
   * Get the hourly data file path for a specific month
   */
  getHourlyFilePath(deviceId: string, month: string): string {
    return path.join(this.getDeviceDirectory(deviceId), FILESYSTEM.HOURLY_DIR, `${month}.json`);
  }

  /**
   * Get the daily data file path for a specific month
   */
  getDailyFilePath(deviceId: string, month: string): string {
    return path.join(this.getDeviceDirectory(deviceId), FILESYSTEM.DAILY_DIR, `${month}.json`);
  }

  /**
   * Get the legacy monthly file path (for backward compatibility)
   */
  getLegacyMonthlyFilePath(deviceId: string, month: string): string {
    return path.join(this.getDeviceDirectory(deviceId), `${month}.json`);
  }

  /**
   * Get the device metadata file path
   */
  getDeviceMetadataPath(): string {
    return path.join(this.dataDir, FILESYSTEM.DEVICES_FILE);
  }

  /**
   * Get the landing page output path
   */
  getLandingPagePath(): string {
    const docsRoot = path.resolve(this.dataDir, '..');
    return path.join(docsRoot, 'index.html');
  }

  /**
   * Get the docs root directory (parent of data directory)
   */
  getDocsRoot(): string {
    return path.resolve(this.dataDir, '..');
  }

  /**
   * Get the data directory
   */
  getDataDirectory(): string {
    return this.dataDir;
  }
}
