export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * Simple structured logger (JSON to stdout). In production it's replaced
 * with pino/compatible — the Logger interface stays the same.
 */
export class ConsoleLogger implements Logger {
  info(message: string, meta?: Record<string, unknown>): void {
    this.write("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write("warn", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.write("error", message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.write("debug", message, meta);
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const entry = { level, message, time: new Date().toISOString(), ...(meta ?? {}) };
    console.log(JSON.stringify(entry));
  }
}
