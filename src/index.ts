/**
 * Main Entry Point
 *
 * Initializes and runs the Telraam data collection process.
 */

import dotenv from 'dotenv';
import { TelraamClient } from './telraamClient.js';
import { Storage } from './services/index.js';
import { DataCollector } from './collector.js';
import { devices, loadConfig } from './config.js';
import { createLogger, LOG_NAMESPACES } from './utils/index.js';

const logger = createLogger(LOG_NAMESPACES.MAIN);

// Load environment variables from .env file
dotenv.config();

// Get configuration after loading environment variables
const config = loadConfig();

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  const startTime = new Date();

  logger.info('Starting Telraam Data Collector', {
    startTime: startTime.toISOString(),
    devices: devices.length,
    daysToFetch: config.daysToFetch,
  });

  try {
    // Initialize components
    const client = new TelraamClient(config.apiUrl, config.apiKey);
    const storage = new Storage(config.dataDir);
    const collector = new DataCollector({
      client,
      storage,
      devices,
      daysToFetch: config.daysToFetch,
      requestDelayMs: config.requestDelayMs,
    });

    // Run collection
    const summary = await collector.collectAllDevices();

    // Print success footer
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;

    logger.info('Collection completed successfully', {
      endTime: endTime.toISOString(),
      durationSeconds: duration,
      totalDataPoints: summary.results.reduce((sum, r) => sum + r.dataPointsCollected, 0),
    });

    process.exit(0);
  } catch (error) {
    logger.error('Collection failed', error instanceof Error ? error : { error });
    process.exit(1);
  }
}

// Start the application
main();
