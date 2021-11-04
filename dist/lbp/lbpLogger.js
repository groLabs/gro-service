"use strict";
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
const lbpLogger = createLogger({
    format: combine(errors({ stack: true }), timestamp(), logMsgFormat),
    transports: [
        new transports.DailyRotateFile({
            filename: 'lbp-error-%DATE%.log',
            level: 'error',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/lbpLogs`,
            auditFile: 'lbp-error-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
        new transports.DailyRotateFile({
            filename: 'lbp-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/lbpLogs`,
            auditFile: 'lbp-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
    ],
    exceptionHandlers: [
        new transports.DailyRotateFile({
            filename: 'lbp-exception-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/lbpLogs`,
            auditFile: 'lbp-exception-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
    ],
    rejectionHandlers: [
        new transports.DailyRotateFile({
            filename: 'lbp-rejection-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/lbpLogs`,
            auditFile: 'lbp-rejection-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
    ],
    exitOnError: false,
});
if (process.env.NODE_ENV !== 'production') {
    lbpLogger.add(new transports.Console({
        format: logMsgFormat,
    }));
}
module.exports = lbpLogger;
