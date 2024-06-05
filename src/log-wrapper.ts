import { debuglog, type DebugLogger } from 'node:util';
import type { Logger as PinoLogger } from 'pino';

export type Logger = PinoLogger | DebugLogger | Console;

export class LogWrapper {
  logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? debuglog('bun-cluster-reload');
  }

  debug(msg: string) {
    if ('debug' in this.logger) {
      this.logger.debug(msg);
    } else {
      this.logger(msg);
    }
  }

  info(msg: string) {
    if ('info' in this.logger) {
      this.logger.info(msg);
    } else {
      this.logger(msg);
    }
  }

  warn(msg: string) {
    if ('warn' in this.logger) {
      this.logger.warn(msg);
    } else {
      this.logger(msg);
    }
  }

  error(msg: string) {
    if ('error' in this.logger) {
      this.logger.error(msg);
    } else {
      this.logger(msg);
    }
  }
}
