/**
 * Logger Utility
 *
 * Provides consistent, structured logging throughout the application.
 * Each module gets its own logger instance with a namespace prefix.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
  /** Minimum log level to display */
  level?: LogLevel;
  /** Enable timestamps */
  timestamps?: boolean;
  /** Enable colors (if terminal supports it) */
  colors?: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Logger instance for a specific module
 */
export class Logger {
  private readonly namespace: string;
  private readonly config: Required<LoggerConfig>;

  constructor(namespace: string, config: LoggerConfig = {}) {
    this.namespace = namespace;
    this.config = {
      level: config.level ?? 'info',
      timestamps: config.timestamps ?? false,
      colors: config.colors ?? false,
    };
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: unknown, ...args: unknown[]): void {
    if (error instanceof Error) {
      this.log('error', message, error.message, ...args);
      if (error.stack) {
        this.log('error', error.stack);
      }
    } else {
      this.log('error', message, error, ...args);
    }
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const prefix = this.formatPrefix(level);
    const formattedMessage = this.formatMessage(message, ...args);

    const logFn = this.getLogFunction(level);
    logFn(`${prefix} ${formattedMessage}`);
  }

  /**
   * Check if message should be logged based on level
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  /**
   * Format the log prefix
   */
  private formatPrefix(level: LogLevel): string {
    const timestamp = this.config.timestamps ? `${new Date().toISOString()} ` : '';

    const levelStr = level.toUpperCase().padEnd(5);
    return `${timestamp}[${levelStr}] [${this.namespace}]`;
  }

  /**
   * Format the message with arguments
   */
  private formatMessage(message: string, ...args: unknown[]): string {
    if (args.length === 0) {
      return message;
    }

    const formattedArgs = args
      .map((arg) => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');

    return `${message} ${formattedArgs}`;
  }

  /**
   * Get the appropriate console function for the log level
   */
  private getLogFunction(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case 'debug':
        return console.debug;
      case 'info':
        return console.log;
      case 'warn':
        return console.warn;
      case 'error':
        return console.error;
    }
  }
}

/**
 * Create a logger instance for a module
 */
export function createLogger(namespace: string, config?: LoggerConfig): Logger {
  return new Logger(namespace, config);
}
