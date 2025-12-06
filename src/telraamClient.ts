/**
 * Telraam API Client
 *
 * Handles all communication with the Telraam API, including authentication,
 * request formatting, and error handling.
 *
 * Uses openapi-typescript-fetch for type-safe API calls based on the
 * OpenAPI specification.
 */

import { Fetcher } from 'openapi-typescript-fetch';
import type { paths } from './generated/telraam-api.js';
import type {
  DateRange,
  TrafficDataPoint,
  TrafficReportRequest,
  TrafficReportResponse,
} from './types.js';
import { createLogger } from './utils/logger.js';
import { formatDateTimeForAPI } from './utils/datetime.js';
import { API, ERRORS, LOG_NAMESPACES } from './utils/constants.js';

const logger = createLogger(LOG_NAMESPACES.CLIENT);

/**
 * Error thrown when API requests fail
 */
export class TelraamApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseData?: unknown,
  ) {
    super(message);
    this.name = 'TelraamApiError';
  }
}

/**
 * Client for interacting with the Telraam API
 *
 * This client uses the generated OpenAPI types to provide compile-time
 * type safety for all API requests and responses.
 *
 * @example
 * const client = new TelraamClient('https://telraam-api.net', 'your-api-key');
 * const data = await client.fetchTrafficData('9000004698', { start, end });
 */
export class TelraamClient {
  private readonly fetcher: ReturnType<typeof Fetcher.for<paths>>;

  constructor(apiUrl: string, apiKey: string) {
    if (!apiKey) {
      throw new Error(ERRORS.CONFIG.MISSING_API_KEY);
    }

    // Initialize the type-safe fetcher
    this.fetcher = Fetcher.for<paths>();

    // Configure the fetcher with base URL and authentication
    this.fetcher.configure({
      baseUrl: apiUrl,
      init: {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
      },
    });

    logger.debug(`Initialized Telraam API client for ${apiUrl}`);
  }

  /**
   * Fetch traffic data for a specific device and time range
   *
   * @param deviceId - The Telraam device/segment identifier
   * @param dateRange - The date range to fetch data for
   * @returns Array of traffic data points
   * @throws {TelraamApiError} If the API request fails
   *
   * @example
   * const dateRange = {
   *   start: new Date('2024-11-01'),
   *   end: new Date('2024-12-01')
   * };
   * const data = await client.fetchTrafficData('9000004698', dateRange);
   */
  async fetchTrafficData(deviceId: string, dateRange: DateRange): Promise<TrafficDataPoint[]> {
    // Create a typed operation for the traffic endpoint
    const getTraffic = this.fetcher.path(API.ENDPOINTS.TRAFFIC).method('post').create();

    // Build the request body
    const requestBody: TrafficReportRequest = {
      level: API.PARAMS.LEVEL,
      format: API.PARAMS.FORMAT,
      id: deviceId,
      time_start: formatDateTimeForAPI(dateRange.start),
      time_end: formatDateTimeForAPI(dateRange.end),
    };

    logger.info(
      `Fetching data for device ${deviceId} from ${requestBody.time_start} to ${requestBody.time_end}`,
    );

    try {
      // Make the type-safe API call
      const { data } = await getTraffic(requestBody);

      return this.validateAndExtractData(data, deviceId);
    } catch (error) {
      throw this.handleApiError(error, deviceId);
    }
  }

  /**
   * Validate API response and extract traffic data
   */
  private validateAndExtractData(
    data: TrafficReportResponse,
    deviceId: string,
  ): TrafficDataPoint[] {
    if (!data?.report) {
      logger.warn(`No data received for device ${deviceId}`);
      return [];
    }

    const dataPoints = data.report ?? [];
    logger.info(`Retrieved ${dataPoints.length} data points for device ${deviceId}`);

    return dataPoints;
  }

  /**
   * Handle and transform API errors
   */
  private handleApiError(error: unknown, deviceId: string): TelraamApiError {
    // Handle fetch Response errors
    if (error instanceof Response) {
      logger.error(
        `API Error for device ${deviceId}`,
        `Status: ${error.status} ${error.statusText}`,
      );

      return new TelraamApiError(
        `API request failed with status ${error.status}: ${error.statusText}`,
        error.status,
        error.statusText,
      );
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      logger.error(`Network error for device ${deviceId}`, error);
      return new TelraamApiError(ERRORS.API.NETWORK_ERROR);
    }

    // Handle other errors
    if (error instanceof Error) {
      logger.error(`Error for device ${deviceId}`, error);
      return new TelraamApiError(error.message);
    }

    logger.error(`Unexpected error for device ${deviceId}`, error);
    return new TelraamApiError(`Unexpected error: ${String(error)}`);
  }
}
