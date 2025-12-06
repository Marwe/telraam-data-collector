/**
 * Data Collector Module
 *
 * Orchestrates the data collection process for multiple devices.
 * Handles fetching, storing, and aggregating traffic data.
 */

import { TelraamClient, TelraamApiError } from './telraamClient.js';
import { Storage } from './storage.js';
import type {
  DeviceConfig,
  DeviceMetadata,
  MonthlyData,
  CollectionResult,
  CollectionSummary,
  TrafficDataPoint,
} from './types.js';
import { calculateDateRange, createLogger, LOG_NAMESPACES } from './utils/index.js';

const logger = createLogger(LOG_NAMESPACES.COLLECTOR);

/**
 * Configuration for the data collector
 */
export interface CollectorConfig {
  /** API client instance */
  client: TelraamClient;
  /** Storage instance */
  storage: Storage;
  /** List of devices to collect data for */
  devices: DeviceConfig[];
  /** Number of days to fetch (counting back from today) */
  daysToFetch: number;
}

/**
 * Manages data collection for multiple Telraam devices
 */
export class DataCollector {
  private readonly client: TelraamClient;
  private readonly storage: Storage;
  private readonly devices: DeviceConfig[];
  private readonly daysToFetch: number;

  constructor(config: CollectorConfig) {
    this.client = config.client;
    this.storage = config.storage;
    this.devices = config.devices;
    this.daysToFetch = config.daysToFetch;
  }

  /**
   * Collect data for all configured devices
   * @throws {Error} If any device collection fails
   */
  async collectAllDevices(): Promise<CollectionSummary> {
    const startTime = new Date();

    logger.info(`Starting data collection for ${this.devices.length} devices`);
    logger.info(`Fetching last ${this.daysToFetch} days of data`);

    const results: CollectionResult[] = [];
    const deviceMetadata: DeviceMetadata[] = [];

    for (const device of this.devices) {
      const result = await this.collectSingleDevice(device);
      results.push(result);

      // Create metadata entry
      deviceMetadata.push({
        id: device.id,
        name: device.name,
        location: device.location,
        lastUpdated: new Date().toISOString(),
        totalDataPoints: result.dataPointsCollected,
      });
    }

    // Save device metadata
    await this.storage.saveDeviceMetadata(deviceMetadata);
    await this.storage.generateLandingPage();

    const endTime = new Date();
    const summary = this.createSummary(results, startTime, endTime);

    // Report results
    this.logSummary(summary);

    // Throw if any device failed
    if (summary.failedDevices > 0) {
      throw new Error(`Collection completed with ${summary.failedDevices} error(s)`);
    }

    return summary;
  }

  /**
   * Collect data for a single device
   */
  private async collectSingleDevice(device: DeviceConfig): Promise<CollectionResult> {
    logger.info(`Processing device: ${device.name} (${device.id})`);

    try {
      const dateRange = calculateDateRange(this.daysToFetch);
      const dataPoints = await this.client.fetchTrafficData(device.id, dateRange);

      if (dataPoints.length === 0) {
        logger.warn(`No data returned for device ${device.id}`);
        return {
          deviceId: device.id,
          success: true,
          dataPointsCollected: 0,
        };
      }

      // Group data by month and save
      const totalPoints = await this.saveDeviceData(device.id, dataPoints);

      return {
        deviceId: device.id,
        success: true,
        dataPointsCollected: totalPoints,
      };
    } catch (error) {
      const errorMessage = this.formatError(error);
      logger.error(`Failed to collect data for device ${device.id}: ${errorMessage}`);

      return {
        deviceId: device.id,
        success: false,
        dataPointsCollected: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Save device data grouped by month
   */
  private async saveDeviceData(deviceId: string, dataPoints: TrafficDataPoint[]): Promise<number> {
    const monthlyDataMap = this.storage.groupDataByMonth(dataPoints);

    let totalPoints = 0;
    for (const [month, monthData] of monthlyDataMap.entries()) {
      const monthlyData: MonthlyData = {
        device_id: deviceId,
        month,
        data: monthData,
        lastUpdated: new Date().toISOString(),
      };

      await this.storage.saveMonthlyData(deviceId, monthlyData);
      const dailyEntries = this.storage.buildDailyEntries(monthData);
      await this.storage.saveDailyData(deviceId, month, dailyEntries);
      totalPoints += monthData.length;
    }

    return totalPoints;
  }

  /**
   * Create a collection summary from individual results
   */
  private createSummary(
    results: CollectionResult[],
    startTime: Date,
    endTime: Date,
  ): CollectionSummary {
    const successfulDevices = results.filter((r) => r.success).length;
    const failedDevices = results.filter((r) => !r.success).length;

    return {
      totalDevices: results.length,
      successfulDevices,
      failedDevices,
      results,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };
  }

  /**
   * Log collection summary
   */
  private logSummary(summary: CollectionSummary): void {
    logger.info('Collection complete!');
    logger.info(
      `Successfully processed: ${summary.successfulDevices}/${summary.totalDevices} devices`,
    );

    if (summary.failedDevices > 0) {
      logger.error('Errors encountered:');
      summary.results
        .filter((r) => !r.success)
        .forEach((result) => {
          logger.error(`  - Device ${result.deviceId}: ${result.error}`);
        });
    }

    // Log total data points collected
    const totalDataPoints = summary.results.reduce((sum, r) => sum + r.dataPointsCollected, 0);
    logger.info(`Total data points collected: ${totalDataPoints}`);
  }

  /**
   * Format error message for logging
   */
  private formatError(error: unknown): string {
    if (error instanceof TelraamApiError) {
      return `API Error (${error.statusCode || 'unknown'}): ${error.message}`;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
