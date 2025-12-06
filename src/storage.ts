/**
 * Storage Module
 *
 * Manages file-based storage for device metadata and traffic data.
 * Handles deduplication, merging, and organizing data by month.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type {
  DailyData,
  DailyEntry,
  DailyTotals,
  DeviceMetadata,
  MonthlyData,
  TrafficDataPoint,
} from './types.js';
import { createLogger, LOG_NAMESPACES } from './utils/index.js';
import { extractMonth } from './utils/datetime.js';
import { isFileSystemError } from './utils/validation.js';
import { FILESYSTEM } from './utils/constants.js';

const logger = createLogger(LOG_NAMESPACES.STORAGE);

/**
 * Storage manager for Telraam data
 */
export class Storage {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  /**
   * Ensure a directory exists, creating it if necessary
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      logger.error(`Error creating directory ${dirPath}`, error);
      throw new Error(
        `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Save device metadata to devices.json
   */
  async saveDeviceMetadata(devices: DeviceMetadata[]): Promise<void> {
    const filePath = path.join(this.dataDir, FILESYSTEM.DEVICES_FILE);

    await this.writeJsonFile(filePath, devices, 'saving device metadata');

    logger.info(`Saved metadata for ${devices.length} devices to ${filePath}`);
  }

  /**
   * Generate a simple landing page that links to all JSON files under the data directory.
   * Intended for GitHub Pages so consumers can easily navigate and download files.
   */
  async generateLandingPage(): Promise<void> {
    const docsRoot = path.resolve(this.dataDir, '..');
    await this.ensureDirectoryExists(docsRoot);

    const jsonFiles = await this.collectJsonFiles(this.dataDir);
    const relativeLinks = jsonFiles
      .map((filePath) => path.relative(docsRoot, filePath).split(path.sep).join('/'))
      .sort();

    const html = this.buildLandingPage(relativeLinks);
    const outputPath = path.join(docsRoot, 'index.html');

    try {
      await fs.writeFile(outputPath, html, FILESYSTEM.ENCODING);
      logger.info(
        `Updated landing page with ${relativeLinks.length} JSON file(s) at ${outputPath}`,
      );
    } catch (error) {
      logger.error('Error while writing landing page', error);
      throw new Error(
        `Failed while writing landing page: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Load device metadata from devices.json
   */
  async loadDeviceMetadata(): Promise<DeviceMetadata[]> {
    const filePath = path.join(this.dataDir, FILESYSTEM.DEVICES_FILE);
    const data = await this.readJsonFile<DeviceMetadata[]>(filePath, 'loading device metadata');

    if (!data) {
      logger.debug('No existing device metadata found');
      return [];
    }

    return data;
  }

  /**
   * Save monthly data for a device, merging with existing data
   */
  async saveMonthlyData(deviceId: string, monthlyData: MonthlyData): Promise<void> {
    const deviceDir = this.getDeviceDirectory(deviceId);
    const filePath = path.join(deviceDir, `${monthlyData.month}.json`);

    try {
      const existingData = await this.loadMonthlyData(deviceId, monthlyData.month);

      const mergedData = this.mergeDataPoints(deviceId, existingData?.data || [], monthlyData.data);

      const updatedMonthlyData: MonthlyData = {
        device_id: deviceId,
        month: monthlyData.month,
        data: mergedData,
        lastUpdated: new Date().toISOString(),
      };

      await this.writeJsonFile(
        filePath,
        updatedMonthlyData,
        `saving monthly data for device ${deviceId}`,
      );

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
   * Save aggregated daily data for a device and month
   */
  async saveDailyData(deviceId: string, month: string, entries: DailyEntry[]): Promise<void> {
    const filePath = path.join(this.getDeviceDirectory(deviceId), 'daily', `${month}.json`);

    try {
      const existing = await this.loadDailyData(deviceId, month);
      const merged = this.mergeDailyEntries(existing?.days ?? [], entries);

      const dailyData: DailyData = {
        device_id: deviceId,
        month,
        days: merged,
        lastUpdated: new Date().toISOString(),
      };

      await this.writeJsonFile(
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
    const filePath = path.join(this.getDeviceDirectory(deviceId), 'daily', `${month}.json`);

    return this.readJsonFile<DailyData>(
      filePath,
      `loading daily data for device ${deviceId}, month ${month}`,
    );
  }

  /**
   * Load monthly data for a device
   */
  async loadMonthlyData(deviceId: string, month: string): Promise<MonthlyData | null> {
    const filePath = path.join(this.getDeviceDirectory(deviceId), `${month}.json`);

    return this.readJsonFile<MonthlyData>(
      filePath,
      `loading monthly data for device ${deviceId}, month ${month}`,
    );
  }

  /**
   * Merge data points, removing duplicates and sorting by date
   */
  private mergeDataPoints(
    deviceId: string,
    existing: TrafficDataPoint[],
    newData: TrafficDataPoint[],
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
    newData.forEach(addPoint);

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
      `Merged data: ${existing.length} existing + ${newData.length} new = ${merged.length} total unique points`,
    );

    return merged;
  }

  /**
   * Create a unique key for a data point based on its date/time
   * The API returns ISO timestamp in the date field (e.g., "2024-06-12T11:00:00.000Z")
   */
  private createDataPointKey(point: TrafficDataPoint): string | null {
    // Use the full ISO timestamp as the unique key
    return point.date ?? null;
  }

  /**
   * Group data points by month (YYYY-MM)
   */
  groupDataByMonth(data: TrafficDataPoint[]): Map<string, TrafficDataPoint[]> {
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
  groupDataByDay(data: TrafficDataPoint[]): Map<string, TrafficDataPoint[]> {
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
   * Merge existing and new daily aggregates by date
   */
  private mergeDailyEntries(existing: DailyEntry[], incoming: DailyEntry[]): DailyEntry[] {
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
   * Build aggregated daily entries from a set of hourly data points
   */
  buildDailyEntries(points: TrafficDataPoint[]): DailyEntry[] {
    const grouped = this.groupDataByDay(points);
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

  private async writeJsonFile<T>(filePath: string, data: T, context: string): Promise<void> {
    await this.ensureDirectoryExists(path.dirname(filePath));

    try {
      const json = JSON.stringify(data, null, FILESYSTEM.JSON_INDENT);
      await fs.writeFile(filePath, json, FILESYSTEM.ENCODING);
    } catch (error) {
      logger.error(`Error while ${context}`, error);
      throw new Error(
        `Failed while ${context}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async readJsonFile<T>(filePath: string, context: string): Promise<T | null> {
    try {
      const data = await fs.readFile(filePath, FILESYSTEM.ENCODING);
      return JSON.parse(data) as T;
    } catch (error: unknown) {
      if (isFileSystemError(error) && error.code === 'ENOENT') {
        return null;
      }
      logger.error(`Error while ${context}`, error);
      throw new Error(
        `Failed while ${context}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private getDeviceDirectory(deviceId: string): string {
    return path.join(this.dataDir, `${FILESYSTEM.DEVICE_DIR_PREFIX}${deviceId}`);
  }

  private async collectJsonFiles(rootDir: string): Promise<string[]> {
    const results: string[] = [];
    const entries = await fs.readdir(rootDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        const nested = await this.collectJsonFiles(fullPath);
        results.push(...nested);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        results.push(fullPath);
      }
    }

    return results;
  }

  private buildLandingPage(links: string[]): string {
    const grouped = this.groupLinks(links);
    const sections = grouped
      .map(
        ({ title, items }) => `      <details open>
        <summary>${title} <span class="count">(${items.length})</span></summary>
        <ul class="list">
${items
  .map(
    ({ path, label }) => `          <li data-path="${path.toLowerCase()}">
            <a href="${path}">${path}</a>${label ? `<span class="tag">${label}</span>` : ''}</li>`,
  )
  .join('\n')}
        </ul>
      </details>`,
      )
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Telraam Data Downloads</title>
  <style>
    :root {
      font-family: "Inter", system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    }
    body {
      margin: 0;
      padding: 24px;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      padding: 24px 28px;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
      border: 1px solid #e2e8f0;
    }
    h1 { margin-top: 0; letter-spacing: -0.01em; }
    p { color: #475569; }
    .controls {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin: 12px 0 20px;
    }
    input[type="search"] {
      flex: 1;
      min-width: 240px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      font-size: 14px;
    }
    .list {
      list-style: none;
      padding-left: 0;
      display: grid;
      gap: 8px;
    }
    .list a {
      display: inline-block;
      padding: 10px 12px;
      border-radius: 10px;
      background: #f8fafc;
      color: #0f172a;
      text-decoration: none;
      border: 1px solid #e2e8f0;
      transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
      word-break: break-all;
    }
    .list a:hover {
      transform: translateY(-1px);
      border-color: #cbd5e1;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
    }
    .meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin: 12px 0 20px;
      color: #475569;
      font-size: 14px;
    }
    details { margin-bottom: 12px; }
    summary {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
    }
    .count {
      color: #64748b;
      font-weight: 500;
      font-size: 13px;
    }
    .tag {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 8px;
      border-radius: 999px;
      background: #e2e8f0;
      color: #0f172a;
      font-size: 12px;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <main class="container">
    <h1>Telraam Data Downloads</h1>
    <p>Browse and download the latest collected JSON files. Updated automatically after each collection run.</p>
    <div class="meta">
      <span><strong>Files:</strong> ${links.length}</span>
      <span><strong>Last updated:</strong> ${new Date().toISOString()}</span>
    </div>
    <div class="controls">
      <input id="filter" type="search" placeholder="Filter by path (e.g. device_9000008311 daily)" />
    </div>
${sections}
  </main>
  <script>
    const input = document.getElementById('filter');
    const items = Array.from(document.querySelectorAll('[data-path]'));
    const groups = Array.from(document.querySelectorAll('details'));

    function applyFilter() {
      const q = input.value.toLowerCase().trim();
      items.forEach((item) => {
        const match = !q || item.dataset.path.includes(q);
        item.style.display = match ? '' : 'none';
      });
      groups.forEach((group) => {
        const visible = Array.from(group.querySelectorAll('li')).some(
          (li) => li.style.display !== 'none',
        );
        group.style.display = visible ? '' : 'none';
      });
    }

    input.addEventListener('input', applyFilter);
  </script>
</body>
</html>`;
  }

  private groupLinks(
    links: string[],
  ): { title: string; items: Array<{ path: string; label?: string }> }[] {
    const deviceMap = new Map<string, Array<{ path: string; label?: string }>>();
    const rootItems: Array<{ path: string; label?: string }> = [];

    for (const link of links) {
      const parts = link.split('/');
      const maybeDevice = parts[1];
      const label = parts.includes('daily') ? 'daily' : 'monthly';

      if (maybeDevice?.startsWith(FILESYSTEM.DEVICE_DIR_PREFIX)) {
        const key = maybeDevice;
        if (!deviceMap.has(key)) deviceMap.set(key, []);
        deviceMap.get(key)!.push({ path: link, label });
      } else {
        rootItems.push({ path: link, label: 'metadata' });
      }
    }

    const deviceSections = Array.from(deviceMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([device, items]) => ({
        title: device,
        items: items.sort((a, b) => a.path.localeCompare(b.path)),
      }));

    const sections = [];
    if (rootItems.length) {
      sections.push({
        title: 'Root & metadata',
        items: rootItems.sort((a, b) => a.path.localeCompare(b.path)),
      });
    }
    sections.push(...deviceSections);
    return sections;
  }
}
