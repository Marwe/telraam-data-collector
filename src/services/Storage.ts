/**
 * Storage Service
 *
 * Facade for all storage operations. Coordinates FileService, DataMerger,
 * PathManager, and HTMLGenerator to provide a clean API for data persistence.
 */

import path from 'path';
import type {
  DeviceMetadata,
  MonthlyData,
  DailyData,
  DailyEntry,
  TrafficDataPoint,
} from '../types.js';
import { createLogger, LOG_NAMESPACES } from '../utils/index.js';
import { FileService } from './FileService.js';
import { DataMerger } from './DataMerger.js';
import { PathManager } from './PathManager.js';
import { HTMLGenerator } from './HTMLGenerator.js';

const logger = createLogger(LOG_NAMESPACES.STORAGE);

/**
 * High-level storage interface for device data and metadata
 */
export class Storage {
  private readonly fileService: FileService;
  private readonly dataMerger: DataMerger;
  private readonly pathManager: PathManager;
  private readonly htmlGenerator: HTMLGenerator;

  constructor(dataDir: string) {
    this.fileService = new FileService();
    this.dataMerger = new DataMerger();
    this.pathManager = new PathManager(dataDir);
    this.htmlGenerator = new HTMLGenerator();
  }

  /**
   * Save device metadata to devices.json
   */
  async saveDeviceMetadata(devices: DeviceMetadata[]): Promise<void> {
    const filePath = this.pathManager.getDeviceMetadataPath();
    await this.fileService.writeJson(filePath, devices, 'saving device metadata');
    logger.info(`Saved metadata for ${devices.length} devices to ${filePath}`);
  }

  /**
   * Load device metadata from devices.json
   */
  async loadDeviceMetadata(): Promise<DeviceMetadata[]> {
    const filePath = this.pathManager.getDeviceMetadataPath();
    const data = await this.fileService.readJson<DeviceMetadata[]>(
      filePath,
      'loading device metadata',
    );

    if (!data) {
      logger.debug('No existing device metadata found');
      return [];
    }

    return data;
  }

  /**
   * Generate a landing page HTML file for GitHub Pages
   */
  async generateLandingPage(): Promise<void> {
    const html = this.htmlGenerator.generateLandingPage();
    const outputPath = this.pathManager.getLandingPagePath();

    const dataDir = this.pathManager.getDataDirectory();
    const jsonFiles = await this.fileService.collectJsonFiles(dataDir);
    const docsRoot = this.pathManager.getDocsRoot();
    const relativeLinks = jsonFiles
      .map((filePath) => path.relative(docsRoot, filePath).split(path.sep).join('/'))
      .sort();

    await this.fileService.writeText(outputPath, html, 'writing landing page');

    logger.info(`Updated landing page with ${relativeLinks.length} JSON file(s) at ${outputPath}`);
  }

  /**
   * Save monthly data for a device, merging with existing data
   */
  async saveMonthlyData(deviceId: string, monthlyData: MonthlyData): Promise<void> {
    const filePath = this.pathManager.getHourlyFilePath(deviceId, monthlyData.month);

    try {
      const existingData = await this.loadMonthlyData(deviceId, monthlyData.month);

      const mergedData = this.dataMerger.mergeDataPoints(
        deviceId,
        existingData?.data || [],
        monthlyData.data,
      );

      const updatedMonthlyData: MonthlyData = {
        device_id: deviceId,
        month: monthlyData.month,
        data: mergedData,
        lastUpdated: new Date().toISOString(),
      };

      await this.fileService.writeJson(
        filePath,
        updatedMonthlyData,
        `saving monthly data for device ${deviceId}`,
      );

      await this.removeLegacyMonthlyFile(deviceId, monthlyData.month, filePath);

      logger.info(
        `Saved ${mergedData.length} data points for device ${deviceId}, month ${monthlyData.month}`,
      );
    } catch (error) {
      logger.error(`Error saving monthly data for device ${deviceId}`, error);
      throw new Error(
        `Failed to save monthly data: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Load monthly data for a device
   */
  async loadMonthlyData(deviceId: string, month: string): Promise<MonthlyData | null> {
    const primaryPath = this.pathManager.getHourlyFilePath(deviceId, month);
    const legacyPath = this.pathManager.getLegacyMonthlyFilePath(deviceId, month);

    const primary = await this.fileService.readJson<MonthlyData>(
      primaryPath,
      `loading monthly data for device ${deviceId}, month ${month}`,
    );

    if (primary) {
      return primary;
    }

    // Fallback to legacy path for backward compatibility
    return this.fileService.readJson<MonthlyData>(
      legacyPath,
      `loading monthly data for device ${deviceId}, month ${month}`,
    );
  }

  /**
   * Save aggregated daily data for a device and month
   */
  async saveDailyData(deviceId: string, month: string, entries: DailyEntry[]): Promise<void> {
    const filePath = this.pathManager.getDailyFilePath(deviceId, month);

    try {
      const existing = await this.loadDailyData(deviceId, month);
      const merged = this.dataMerger.mergeDailyEntries(existing?.days ?? [], entries);

      const dailyData: DailyData = {
        device_id: deviceId,
        month,
        days: merged,
        lastUpdated: new Date().toISOString(),
      };

      await this.fileService.writeJson(
        filePath,
        dailyData,
        `saving daily data for device ${deviceId}, month ${month}`,
      );

      logger.info(`Saved ${merged.length} daily aggregates for device ${deviceId}, month ${month}`);
    } catch (error) {
      logger.error(`Error saving daily data for device ${deviceId}`, error);
      throw new Error(
        `Failed to save daily data: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Load daily aggregates for a device/month
   */
  async loadDailyData(deviceId: string, month: string): Promise<DailyData | null> {
    const filePath = this.pathManager.getDailyFilePath(deviceId, month);

    return this.fileService.readJson<DailyData>(
      filePath,
      `loading daily data for device ${deviceId}, month ${month}`,
    );
  }

  /**
   * Group traffic data points by month
   */
  groupDataByMonth(data: TrafficDataPoint[]): Map<string, TrafficDataPoint[]> {
    return this.dataMerger.groupByMonth(data);
  }

  /**
   * Build daily aggregates from hourly data
   */
  buildDailyEntries(points: TrafficDataPoint[]): DailyEntry[] {
    return this.dataMerger.buildDailyEntries(points);
  }

  /**
   * Remove legacy monthly file after migration
   */
  private async removeLegacyMonthlyFile(
    deviceId: string,
    month: string,
    newPath: string,
  ): Promise<void> {
    const legacyPath = this.pathManager.getLegacyMonthlyFilePath(deviceId, month);
    if (legacyPath === newPath) {
      return;
    }

    await this.fileService.deleteFile(legacyPath);
  }
}
