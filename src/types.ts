/**
 * Type definitions for the Telraam Data Collector
 *
 * This module re-exports types from the generated OpenAPI specification
 * and defines domain-specific types for our application.
 */

import type { paths } from './generated/telraam-api.js';

// ============================================================================
// API Types (from OpenAPI specification)
// ============================================================================

/**
 * Traffic report API endpoint types
 */
type TrafficEndpoint = paths['/v1/reports/traffic']['post'];

/**
 * Request body for the traffic report API
 */
export type TrafficReportRequest = NonNullable<
  TrafficEndpoint['requestBody']
>['content']['application/json'];

/**
 * Successful response from the traffic report API
 */
export type TrafficReportResponse = NonNullable<
  TrafficEndpoint['responses']['200']
>['content']['application/json'];

/**
 * Individual traffic data point from the API response
 */
export type TrafficDataPoint = NonNullable<TrafficReportResponse['report']>[number];

// ============================================================================
// Domain Types
// ============================================================================

/**
 * Device configuration
 */
export interface DeviceConfig {
  /** Telraam device/segment identifier */
  id: string;
  /** Human-readable device name */
  name: string;
  /** Device location description */
  location: string;
}

/**
 * Device metadata stored in devices.json
 */
export interface DeviceMetadata extends DeviceConfig {
  /** ISO timestamp of last update */
  lastUpdated: string;
  /** Total number of data points collected */
  totalDataPoints: number;
}

/**
 * Monthly data file structure
 */
export interface MonthlyData {
  /** Device identifier */
  device_id: string;
  /** Month in YYYY-MM format */
  month: string;
  /** ISO timestamp of last update */
  lastUpdated: string;
  /** Array of traffic data points */
  data: TrafficDataPoint[];
}

/**
 * Aggregated daily totals derived from hourly traffic data
 */
export interface DailyTotals {
  /** Number of hourly records aggregated */
  hours: number;
  /** Average uptime across the day (if provided in source data) */
  uptime_avg?: number;
  heavy?: number;
  car?: number;
  bike?: number;
  pedestrian?: number;
  night?: number;
  heavy_lft?: number;
  heavy_rgt?: number;
  car_lft?: number;
  car_rgt?: number;
  bike_lft?: number;
  bike_rgt?: number;
  pedestrian_lft?: number;
  pedestrian_rgt?: number;
  night_lft?: number;
  night_rgt?: number;
}

/**
 * Daily aggregate for a single date
 */
export interface DailyEntry {
  /** Date in YYYY-MM-DD */
  date: string;
  /** Aggregated totals */
  totals: DailyTotals;
}

/**
 * Daily data file structure (aggregated per day)
 */
export interface DailyData {
  /** Device identifier */
  device_id: string;
  /** Month in YYYY-MM the file represents */
  month: string;
  /** ISO timestamp of last update */
  lastUpdated: string;
  /** Per-day aggregates */
  days: DailyEntry[];
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Date range for data fetching
 */
export interface DateRange {
  /** Start date (inclusive) */
  start: Date;
  /** End date (exclusive) */
  end: Date;
}

/**
 * Collection result for a single device
 */
export interface CollectionResult {
  /** Device identifier */
  deviceId: string;
  /** Whether collection was successful */
  success: boolean;
  /** Number of data points collected */
  dataPointsCollected: number;
  /** ISO timestamp of the most recent data point collected */
  lastUpdated?: string;
  /** Error message if collection failed */
  error?: string;
}

/**
 * Summary of collection run
 */
export interface CollectionSummary {
  /** Total number of devices processed */
  totalDevices: number;
  /** Number of successful collections */
  successfulDevices: number;
  /** Number of failed collections */
  failedDevices: number;
  /** Individual device results */
  results: CollectionResult[];
  /** ISO timestamp of collection start */
  startTime: string;
  /** ISO timestamp of collection end */
  endTime: string;
}
