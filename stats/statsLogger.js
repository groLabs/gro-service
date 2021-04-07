const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, errors } = format;
require('winston-daily-rotate-file');
const config = require('config');
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

const statsLogger = createLogger({
    format: combine(errors({ stack: true }), timestamp(), logMsgFormat),
    transports: [
        new transports.DailyRotateFile({
            filename: 'stats-error-%DATE%.log',
            level: 'error',
            datePattern: 'YYYY-MM-DD',
            dirname: logFolder + '/statsLogs',
            auditFile: 'stats-error-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
        new transports.DailyRotateFile({
            filename: 'stats-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            dirname: logFolder + '/statsLogs',
            auditFile: 'stats-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
    ],
    exceptionHandlers: [
        new transports.DailyRotateFile({
            filename: 'stats-exception-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            dirname: logFolder + '/statsLogs',
            auditFile: 'stats-exception-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
    ],
    rejectionHandlers: [
        new transports.DailyRotateFile({
            filename: 'stats-rejection-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            dirname: logFolder + '/statsLogs',
            auditFile: 'stats-rejection-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
    ],
    exitOnError: false,
});

if (process.env.NODE_ENV !== 'production') {
    statsLogger.add(
        new transports.Console({
            format: logMsgFormat,
        })
    );
}

module.exports = statsLogger;
