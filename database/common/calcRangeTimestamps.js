const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);

// Calculate number of N-second intervals from the start to end dates (in case an historical data load is needed)
const calcRangeTimestamps = (start, end, interval) => {
    try {
        let iterations = [];
        if (start === end) {
            iterations.push(moment.unix(start).utc());
            return iterations;
        }
        const search = (start, end) => {
            if (start < end) {
                iterations.push(moment.unix(start).utc());
                start = start + interval;
                search(start, end);
            }
            return iterations;
        }
        return search(start, end);
    } catch (err) {
        logger.error(`**DB: Error in calcRangeTimestamps.js->calcRangeTimestamps(): ${err}`);
    }
}

module.exports = {
    calcRangeTimestamps,
}
