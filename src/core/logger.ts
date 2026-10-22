/**
 * Central logger. All app logging goes through here so it can be routed to
 * Sentry breadcrumbs in production (wired in the hardening phase) and silenced in tests.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogSink {
  log(level: LogLevel, message: string, context?: Record<string, unknown>): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const consoleSink: LogSink = {
  log(level, message, context) {
    const line = `[${level.toUpperCase()}] ${message}`;
    if (level === 'error') console.error(line, context ?? '');
    else if (level === 'warn') console.warn(line, context ?? '');
    // eslint-disable-next-line no-console
    else if (__DEV__) console.log(line, context ?? '');
  },
};

class Logger {
  private sinks: LogSink[] = [consoleSink];
  private minLevel: LogLevel = __DEV__ ? 'debug' : 'info';

  setMinLevel(level: LogLevel) {
    this.minLevel = level;
  }

  addSink(sink: LogSink) {
    this.sinks.push(sink);
  }

  setSinks(sinks: LogSink[]) {
    this.sinks = sinks;
  }

  private emit(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) return;
    for (const sink of this.sinks) sink.log(level, message, context);
  }

  debug = (message: string, context?: Record<string, unknown>) =>
    this.emit('debug', message, context);
  info = (message: string, context?: Record<string, unknown>) =>
    this.emit('info', message, context);
  warn = (message: string, context?: Record<string, unknown>) =>
    this.emit('warn', message, context);
  error = (message: string, context?: Record<string, unknown>) =>
    this.emit('error', message, context);
}

export const logger = new Logger();
