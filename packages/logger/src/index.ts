import pino, { type Logger } from 'pino';

const isDev = process.env.NODE_ENV !== 'production';
const pretty = process.env.LOG_PRETTY === '1';

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  base: {
    service: process.env.SERVICE_NAME ?? 'lojeo',
    env: process.env.NODE_ENV ?? 'development',
  },
  ...(pretty && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' },
    },
  }),
});

export function child(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}

export type { Logger };
