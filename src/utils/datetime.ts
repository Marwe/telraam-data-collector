/**
 * Date/Time Utilities
 *
 * Helper functions for date and time operations throughout the application.
 */

import type { DateRange } from '../types.js';

/**
 * Format a Date object to API-compatible string
 * Format: "YYYY-MM-DD HH:MM:SSZ"
 *
 * @example
 * formatDateTimeForAPI(new Date('2024-12-06T10:30:00Z'))
 * // => "2024-12-06 10:30:00Z"
 */
export function formatDateTimeForAPI(date: Date): string {
  return date
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Extract month string from ISO date
 * Format: "YYYY-MM"
 *
 * @example
 * extractMonth("2024-12-06T10:30:00.000Z")
 * // => "2024-12"
 */
export function extractMonth(isoDate: string): string {
  return isoDate.substring(0, 7);
}

/**
 * Calculate date range for data collection
 *
 * @param daysToFetch - Number of days to fetch (counting back from today)
 * @returns DateRange object with start and end dates
 *
 * @example
 * calculateDateRange(31)
 * // => { start: 31 days ago, end: now }
 */
export function calculateDateRange(daysToFetch: number): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysToFetch);

  return { start, end };
}

/**
 * Format duration in milliseconds to human-readable string
 *
 * @example
 * formatDuration(5432)
 * // => "5.43s"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Get current ISO timestamp
 *
 * @example
 * now()
 * // => "2024-12-06T10:30:00.000Z"
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Check if a date string is a valid ISO format
 */
export function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString() === dateString;
}
