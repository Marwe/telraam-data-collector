import {
  createLogger as winstonCreateLogger,
  format as winstonFormat,
  transports,
  type Logger as WinstonLogger,
  type Logform,
} from 'winston';
import { ENV } from './constants.js';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export type Logger = WinstonLogger;
export type LogFormat = 'json' | 'pretty';

const FALLBACK_LEVEL: LogLevel = 'info';
const DEFAULT_FORMAT: LogFormat = process.stdout.isTTY ? 'pretty' : 'json';
const ALLOWED_LEVELS: readonly LogLevel[] = ['error', 'warn', 'info', 'debug'];
const ALLOWED_FORMATS: readonly LogFormat[] = ['json', 'pretty'];
const METADATA_EXCLUDE = ['message', 'level', 'timestamp', 'label', 'stack'];

const baseLogger = winstonCreateLogger({
  level: resolveLogLevel(process.env[ENV.LOG_LEVEL]),
  format: winstonFormat.combine(
    winstonFormat.errors({ stack: true }),
    winstonFormat.splat(),
    winstonFormat.metadata({ fillExcept: METADATA_EXCLUDE }),
  ),
  transports: [
    new transports.Console({
      handleExceptions: true,
      handleRejections: true,
      format: buildTransportFormat(resolveLogFormat(process.env[ENV.LOG_FORMAT])),
    }),
  ],
});

export function createLogger(namespace: string): Logger {
  return baseLogger.child({ label: namespace });
}

function resolveLogLevel(input: string | undefined): LogLevel {
  const normalized = input?.toLowerCase();
  return isLogLevel(normalized) ? normalized : FALLBACK_LEVEL;
}

function isLogLevel(value: string | undefined): value is LogLevel {
  return (ALLOWED_LEVELS as readonly string[]).includes(value ?? '');
}

function resolveLogFormat(input: string | undefined): LogFormat {
  const normalized = input?.toLowerCase();
  return isLogFormat(normalized) ? normalized : DEFAULT_FORMAT;
}

function isLogFormat(value: string | undefined): value is LogFormat {
  return (ALLOWED_FORMATS as readonly string[]).includes(value ?? '') as boolean;
}

function buildTransportFormat(logFormat: LogFormat): Logform.Format {
  if (logFormat === 'json') {
    return winstonFormat.combine(
      winstonFormat.timestamp(),
      winstonFormat.json({ replacer: errorReplacer }),
    );
  }

  return winstonFormat.combine(
    winstonFormat.colorize({ all: true }),
    winstonFormat.timestamp(),
    winstonFormat.printf(prettyPrint),
  );
}

function prettyPrint(info: Record<string, unknown>): string {
  const { timestamp, level, message, label, stack, metadata } = info as {
    timestamp?: string;
    level: string;
    message: string;
    label?: string;
    stack?: string;
    metadata?: Record<string, unknown>;
  };

  const meta =
    metadata && Object.keys(metadata).length > 0
      ? ` ${JSON.stringify(metadata, errorReplacer)}`
      : '';

  const base = `${timestamp ?? new Date().toISOString()} [${label ?? 'app'}] ${level}: ${message}`;
  return stack ? `${base}${meta}\n${stack}` : `${base}${meta}`;
}

function errorReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return {
      message: value.message,
      stack: value.stack,
    };
  }
  return value;
}
