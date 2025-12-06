/**
 * Main Entry Point
 *
 * Initializes and runs the Telraam data collection process.
 */

import dotenv from 'dotenv';
import { TelraamClient } from './telraamClient.js';
import { Storage } from './storage.js';
import { DataCollector } from './collector.js';
import { devices, loadConfig } from './config.js';

// Load environment variables from .env file
dotenv.config();

// Get configuration after loading environment variables
const config = loadConfig();

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  const startTime = new Date();

  // Print header
  console.log('='.repeat(60));
  console.log('Telraam Data Collector');
  console.log('='.repeat(60));
  console.log(`Start time: ${startTime.toISOString()}`);
  console.log(`Devices to process: ${devices.length}`);
  console.log(`Days to fetch: ${config.daysToFetch}`);
  console.log('='.repeat(60));

  try {
    // Initialize components
    const client = new TelraamClient(config.apiUrl, config.apiKey);
    const storage = new Storage(config.dataDir);
    const collector = new DataCollector({
      client,
      storage,
      devices,
      daysToFetch: config.daysToFetch,
    });

    // Run collection
    const summary = await collector.collectAllDevices();

    // Print success footer
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;

    console.log('='.repeat(60));
    console.log('Collection completed successfully!');
    console.log(`End time: ${endTime.toISOString()}`);
    console.log(`Duration: ${duration.toFixed(2)}s`);
    console.log(
      `Total data points: ${summary.results.reduce((sum, r) => sum + r.dataPointsCollected, 0)}`,
    );
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    // Print error footer
    console.error('\n' + '='.repeat(60));
    console.error('COLLECTION FAILED');
    console.error('='.repeat(60));
    console.error('Error:', error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    console.error('='.repeat(60));
    process.exit(1);
  }
}

// Start the application
main();
