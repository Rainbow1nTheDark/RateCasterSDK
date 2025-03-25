import { LogLevel } from '../types';

interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  includeTimestamps?: boolean;
}

export class Logger {
  private level: LogLevel;
  private prefix: string;
  private includeTimestamps: boolean;
  
  private readonly LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    none: 4
  };

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || 'info';
    this.prefix = options.prefix || 'RateCaster';
    this.includeTimestamps = options.includeTimestamps || false;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.LOG_LEVELS[level] >= this.LOG_LEVELS[this.level];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = this.includeTimestamps ? `[${new Date().toISOString()}] ` : '';
    return `${timestamp}${this.prefix} ${level.toUpperCase()}: ${message}`;
  }

  public debug(message: string, ...args: any[]): void {
    if (!this.shouldLog('debug')) return;
    
    if (args.length > 0) {
      console.debug(this.formatMessage('debug', message), ...args);
    } else {
      console.debug(this.formatMessage('debug', message));
    }
  }

  public info(message: string, ...args: any[]): void {
    if (!this.shouldLog('info')) return;
    
    if (args.length > 0) {
      console.info(this.formatMessage('info', message), ...args);
    } else {
      console.info(this.formatMessage('info', message));
    }
  }

  public warn(message: string, ...args: any[]): void {
    if (!this.shouldLog('warn')) return;
    
    if (args.length > 0) {
      console.warn(this.formatMessage('warn', message), ...args);
    } else {
      console.warn(this.formatMessage('warn', message));
    }
  }

  public error(message: string, ...args: any[]): void {
    if (!this.shouldLog('error')) return;
    
    if (args.length > 0) {
      console.error(this.formatMessage('error', message), ...args);
    } else {
      console.error(this.formatMessage('error', message));
    }
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  public getLevel(): LogLevel {
    return this.level;
  }
} 