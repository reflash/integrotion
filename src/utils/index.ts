// tslint:disable: no-magic-numbers
import { debug } from 'debug';
import { createLogger, format, transports } from 'winston';
export const serviceLabel = 'integrotion';
import { Readable } from 'stream';

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
export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const todayDate = () => new Date().toISOString().substr(0, 10);

export const stringToReadable = (str: string) => {
    const s = new Readable();
    s.push(str);
    s.push(null);
    return s;
};

export function randomN(arr: any[], n: number) {
    let len = arr.length;
    const result = new Array(n),
        taken = new Array(len);
    if (n > len) throw new RangeError('getRandom: more elements taken than available');
    while (n--) {
        const x = Math.floor(Math.random() * len);
        result[n] = arr[x in taken ? taken[x] : x];
        taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
}

export function addTime(time: string, minutes: number) {
    const res = minutesToTime(timeToMinutes(time) + minutes);
    return res;
}

// Convert time in H[:mm] format to minutes
function timeToMinutes(time: string) {
    const [h, m] = time.split(':');
    const res = parseInt(h) * 60 + (parseInt(m) | 0);
    return res;
}

// Convert minutes to time in H:mm:ss format
function minutesToTime(minutes: number) {
    const z = (n: number) => (n < 10 ? '0' : '') + n;
    const res = ((minutes / 60) | 0) + ':' + z(minutes % 60 | 0);
    return res;
}

export const isGifImage = (filename: string) => filename.includes('.gif');
