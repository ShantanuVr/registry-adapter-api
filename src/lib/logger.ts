import pino from 'pino';
import { appConfig } from './config.js';

const logger = pino({
  level: appConfig.LOG_LEVEL,
  transport: appConfig.LOG_PRETTY ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;

export const createChildLogger = (bindings: Record<string, any>) => {
  return logger.child(bindings);
};

export const logWithTrace = (traceId: string, additionalBindings: Record<string, any> = {}) => {
  return logger.child({ traceId, ...additionalBindings });
};
