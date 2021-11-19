"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("config"));
const winston_1 = require("winston");
const { combine, timestamp, printf, errors } = winston_1.format;
require('winston-daily-rotate-file');
let logFolder = './';
if (config_1.default.has('log_folder')) {
    logFolder = config_1.default.get('log_folder');
}
const logMsgFormat = printf(({ level, message, timestamp, stack }) => {
    if (stack) {
        return `${timestamp} ${level}: ${message} - ${stack}`;
    }
    return `${timestamp} ${level}: ${message}`;
});
const criticalLogger = winston_1.createLogger({
    format: combine(errors({ stack: true }), timestamp(), logMsgFormat),
    transports: [
        new winston_1.transports.DailyRotateFile({
            filename: 'critical-error-%DATE%.log',
            level: 'error',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/criticalLogs`,
            auditFile: 'critical-error-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
        new winston_1.transports.DailyRotateFile({
            filename: 'critical-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/criticalLogs`,
            auditFile: 'critical-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
    ],
    exceptionHandlers: [
        new winston_1.transports.DailyRotateFile({
            filename: 'critical-exception-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}//criticalLogs`,
            auditFile: 'critical-exception-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
    ],
    rejectionHandlers: [
        new winston_1.transports.DailyRotateFile({
            filename: 'critical-rejection-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            dirname: `${logFolder}/criticalLogs`,
            auditFile: 'critical-rejection-audit.json',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
        }),
    ],
    exitOnError: false,
});
if (process.env.NODE_ENV !== 'production') {
    criticalLogger.add(new winston_1.transports.Console({
        format: logMsgFormat,
    }));
}
module.exports = criticalLogger;
