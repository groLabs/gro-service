const config = require('config');
const { createLogger, format, transports } = require('winston');

const { combine, timestamp, printf, errors } = format;
require('winston-daily-rotate-file');

let logFolder = './';

if (config.has('log_folder')) {
    logFolder = config.get('log_folder');
}

const logMsgFormat = printf(({ level, message, timestamp, stack }) => {
    if (stack) {
        return `${timestamp} ${level}: ${message} - ${stack}`;
    }
    return `${timestamp} ${level}: ${message}`;
});

const regularLogger = createLogger({
    format: combine(errors({ stack: true }), timestamp(), logMsgFormat),
    transports: [
        new transports.DailyRotateFile({
            filename: 'regular-error-%DATE%.log',
            level: 'error',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/regularLogs`,
            auditFile: 'regular-error-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
        new transports.DailyRotateFile({
            filename: 'regular-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/regularLogs`,
            auditFile: 'regular-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
    ],
    exceptionHandlers: [
        new transports.DailyRotateFile({
            filename: 'regular-exception-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/regularLogs`,
            auditFile: 'regular-exception-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
    ],
    rejectionHandlers: [
        new transports.DailyRotateFile({
            filename: 'regular-rejection-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/regularLogs`,
            auditFile: 'regular-rejection-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
    ],
    exitOnError: false,
});

if (process.env.NODE_ENV !== 'production') {
    regularLogger.add(
        new transports.Console({
            format: logMsgFormat,
        })
    );
}

module.exports = regularLogger;
