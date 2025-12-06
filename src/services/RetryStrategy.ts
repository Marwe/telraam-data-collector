/**
 * Retry Strategy Service
 *
 * Provides configurable retry logic with exponential backoff.
 * Can be reused across different parts of the application.
 */

import { createLogger, LOG_NAMESPACES } from '../utils/index.js';

const logger = createLogger(LOG_NAMESPACES.CLIENT);

/**
 * Configuration for retry strategy
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay in milliseconds between retries */
  baseDelayMs: number;
  /** Whether to use exponential backoff */
  useExponentialBackoff: boolean;
  /** Custom function to determine if an error should be retried */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  useExponentialBackoff: true,
};

/**
 * Service for executing operations with retry logic
 */
export class RetryStrategy {
  constructor(private readonly config: RetryConfig = DEFAULT_RETRY_CONFIG) {}

  /**
   * Execute an async operation with retry logic
   *
   * @param operation - The operation to execute
   * @param context - Context string for logging
   * @returns The result of the operation
   * @throws The last error if all retries fail
   */
  async execute<T>(operation: () => Promise<T>, context: string): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        const shouldRetry = this.config.shouldRetry
          ? this.config.shouldRetry(error, attempt)
          : this.defaultShouldRetry(error, attempt);

        if (!shouldRetry) {
          throw error;
        }

        const delayMs = this.calculateDelay(attempt);
        logger.warn(
          `Retrying ${context} after error (attempt ${attempt}/${this.config.maxAttempts}, retrying in ${delayMs}ms)`,
          { error: error instanceof Error ? error.message : String(error) },
        );

        await this.delay(delayMs);
      }
    }

    throw lastError;
  }

  /**
   * Calculate delay based on attempt number
   */
  private calculateDelay(attempt: number): number {
    if (this.config.useExponentialBackoff) {
      return this.config.baseDelayMs * 2 ** (attempt - 1);
    }
    return this.config.baseDelayMs;
  }

  /**
   * Default retry decision logic
   * Retries on network errors and server errors (5xx)
   */
  private defaultShouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.config.maxAttempts) {
      return false;
    }

    // Retry on network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }

    // Retry on specific HTTP status codes
    if (this.hasStatusCode(error)) {
      const status = this.extractStatusCode(error);
      return status >= 500 || status === 429; // Server errors or rate limiting
    }

    return false;
  }

  /**
   * Check if error has a status code
   */
  private hasStatusCode(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof (error as { statusCode: unknown }).statusCode === 'number'
    );
  }

  /**
   * Extract status code from error
   */
  private extractStatusCode(error: unknown): number {
    if (this.hasStatusCode(error)) {
      return (error as { statusCode: number }).statusCode;
    }
    return 0;
  }

  /**
   * Delay execution for a specified number of milliseconds
   */
  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Helper function to create a retry strategy with custom configuration
 */
export function createRetryStrategy(config?: Partial<RetryConfig>): RetryStrategy {
  return new RetryStrategy({ ...DEFAULT_RETRY_CONFIG, ...config });
}
