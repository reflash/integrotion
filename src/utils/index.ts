import { debug } from 'debug';
import { createLogger, format, transports } from 'winston';
export const serviceLabel = 'integrotion';

const errorLogger = createLogger({
    level: 'error',
    format: format.combine(
        format.label({ label: serviceLabel }),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        format.splat(),
        format.colorize(),
        format.printf(({ level, message, label, timestamp }) => `${timestamp} ${label || '-'} ${level}: ${message}`),
    ),
    transports: [new transports.Console()],
});

export const logDebug = debug(serviceLabel);
export const logError = (message: string, ...args: any[]) => errorLogger.error(message, ...args);
