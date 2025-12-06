/**
 * Data Merger Service
 *
 * Handles data deduplication, merging, and aggregation logic.
 * Provides pure functions for combining datasets.
 */

import type { TrafficDataPoint, DailyEntry, DailyTotals } from '../types.js';
import { createLogger, LOG_NAMESPACES } from '../utils/index.js';
import { extractMonth } from '../utils/datetime.js';

const logger = createLogger(LOG_NAMESPACES.STORAGE);

/**
 * Service for merging and aggregating traffic data
 */
export class DataMerger {
  /**
   * Merge existing and new data points, removing duplicates
   * Uses ISO timestamp as unique key
   */
  mergeDataPoints(
    deviceId: string,
    existing: TrafficDataPoint[],
    incoming: TrafficDataPoint[],
  ): TrafficDataPoint[] {
    const dataMap = new Map<string, TrafficDataPoint>();
    let skippedMissingDate = 0;

    const addPoint = (point: TrafficDataPoint) => {
      const key = this.createDataPointKey(point);
      if (!key) {
        skippedMissingDate += 1;
        return;
      }
      dataMap.set(key, point);
    };

    existing.forEach(addPoint);
    incoming.forEach(addPoint);

    if (skippedMissingDate > 0) {
      logger.warn(
        `Skipped ${skippedMissingDate} data point(s) for device ${deviceId} because no date timestamp was present`,
      );
    }

    // Convert back to array and sort by date
    const merged = Array.from(dataMap.values()).sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateA.localeCompare(dateB);
    });

    logger.debug(
      `Merged data: ${existing.length} existing + ${incoming.length} new = ${merged.length} total unique points`,
    );

    return merged;
  }

  /**
   * Create a unique key for a data point based on its ISO timestamp
   */
  private createDataPointKey(point: TrafficDataPoint): string | null {
    return point.date ?? null;
  }

  /**
   * Group data points by month (YYYY-MM)
   */
  groupByMonth(data: TrafficDataPoint[]): Map<string, TrafficDataPoint[]> {
    const monthMap = new Map<string, TrafficDataPoint[]>();

    for (const point of data) {
      if (!point.date) continue;

      const month = extractMonth(point.date);

      if (!monthMap.has(month)) {
        monthMap.set(month, []);
      }
      monthMap.get(month)!.push(point);
    }

    return monthMap;
  }

  /**
   * Group data points by day (YYYY-MM-DD)
   */
  groupByDay(data: TrafficDataPoint[]): Map<string, TrafficDataPoint[]> {
    const dayMap = new Map<string, TrafficDataPoint[]>();

    for (const point of data) {
      if (!point.date) continue;

      const day = point.date.substring(0, 10);

      if (!dayMap.has(day)) {
        dayMap.set(day, []);
      }
      dayMap.get(day)!.push(point);
    }

    return dayMap;
  }

  /**
   * Build aggregated daily entries from hourly data points
   */
  buildDailyEntries(points: TrafficDataPoint[]): DailyEntry[] {
    const grouped = this.groupByDay(points);
    const entries: DailyEntry[] = [];

    for (const [date, dayPoints] of grouped.entries()) {
      entries.push({
        date,
        totals: this.aggregateDay(dayPoints),
      });
    }

    return entries.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Merge existing and new daily entries by date
   */
  mergeDailyEntries(existing: DailyEntry[], incoming: DailyEntry[]): DailyEntry[] {
    const map = new Map<string, DailyEntry>();

    for (const entry of existing) {
      map.set(entry.date, entry);
    }

    for (const entry of incoming) {
      map.set(entry.date, entry);
    }

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Aggregate hourly points into daily totals
   */
  private aggregateDay(points: TrafficDataPoint[]): DailyTotals {
    const totals: DailyTotals = {
      hours: points.length,
    };

    const numericFields: (keyof DailyTotals)[] = [
      'heavy',
      'car',
      'bike',
      'pedestrian',
      'night',
      'heavy_lft',
      'heavy_rgt',
      'car_lft',
      'car_rgt',
      'bike_lft',
      'bike_rgt',
      'pedestrian_lft',
      'pedestrian_rgt',
      'night_lft',
      'night_rgt',
    ];

    for (const point of points) {
      for (const field of numericFields) {
        const value = point[field as keyof TrafficDataPoint];
        if (typeof value === 'number') {
          totals[field] = (totals[field] ?? 0) + value;
        }
      }
    }

    // Compute average uptime if available
    const uptimes = points.map((p) => p.uptime).filter((v): v is number => typeof v === 'number');
    if (uptimes.length > 0) {
      totals.uptime_avg = uptimes.reduce((sum, u) => sum + u, 0) / uptimes.length;
    }

    return totals;
  }
}
