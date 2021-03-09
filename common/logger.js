'use strict';

const { createLogger, format, transports } = require('winston')
const { combine, timestamp, printf, errors } = format

const logMsgFormat = printf(({ level, message, timestamp, stack }) => {
	if(stack){
	    return `${timestamp} ${level}: ${message} - ${stack}`;
	}
	return `${timestamp} ${level}: ${message}`;
})

const logger = createLogger({
	level: 'info',
	format: combine(
		errors({ stack: true }),
		timestamp(),
		logMsgFormat
	),
	transports: [
		new transports.File({ filename: 'error.log', level: 'error' }),
		new transports.File({ filename: 'info.log'})
	]
});

if(process.env.NODE_ENV !== 'production') {
	logger.add(new transports.Console({
		format: logMsgFormat
	}))
}

module.exports = logger;