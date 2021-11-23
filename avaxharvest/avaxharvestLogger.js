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

const avaxharvestLogger = createLogger({
    format: combine(errors({ stack: true }), timestamp(), logMsgFormat),
    transports: [
        new transports.DailyRotateFile({
            filename: 'avax-error-%DATE%.log',
            level: 'error',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/avaxLogs`,
            auditFile: 'avax-error-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
        new transports.DailyRotateFile({
            filename: 'avax-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/avaxLogs`,
            auditFile: 'avax-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
    ],
    exceptionHandlers: [
        new transports.DailyRotateFile({
            filename: 'avax-exception-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/avaxLogs`,
            auditFile: 'avax-exception-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
    ],
    rejectionHandlers: [
        new transports.DailyRotateFile({
            filename: 'avax-rejection-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/avaxLogs`,
            auditFile: 'avax-rejection-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
    ],
    exitOnError: false,
});

if (process.env.NODE_ENV !== 'production') {
    avaxharvestLogger.add(
        new transports.Console({
            format: logMsgFormat,
        })
    );
}

module.exports = avaxharvestLogger;
