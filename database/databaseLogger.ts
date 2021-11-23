const config = require('config');
const { createLogger, format, transports } = require('winston');

const { combine, timestamp, printf, errors } = format;
require('winston-daily-rotate-file');

let logFolder = './';

if (config.has('log_folder')) {
    logFolder = config.get('log_folder');
}

const logMsgFormat = printf(({ level, message, timestamp, stack }) => {
    return (stack)
        ? `${timestamp} ${level}: ${message} - ${stack}`
        : `${timestamp} ${level}: ${message}`;
});

const databaseLogger = createLogger({
    format: combine(errors({ stack: true }), timestamp(), logMsgFormat),
    transports: [
        new transports.DailyRotateFile({
            filename: 'database-error-%DATE%.log',
            level: 'error',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/databaseLogs`,
            auditFile: 'database-error-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
        new transports.DailyRotateFile({
            filename: 'database-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/databaseLogs`,
            auditFile: 'database-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
    ],
    exceptionHandlers: [
        new transports.DailyRotateFile({
            filename: 'database-exception-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/databaseLogs`,
            auditFile: 'database-exception-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
    ],
    rejectionHandlers: [
        new transports.DailyRotateFile({
            filename: 'database-rejection-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/databaseLogs`,
            auditFile: 'database-rejection-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
    ],
    exitOnError: false,
});

if (process.env.NODE_ENV !== 'production') {
    databaseLogger.add(
        new transports.Console({
            format: logMsgFormat,
        })
    );
}

module.exports = databaseLogger;
