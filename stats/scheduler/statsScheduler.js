const config = require('config');
const schedule = require('node-schedule');
const { generateGroStatsFile } = require('../handler/statsHandler');
const {
    sendMessageToAlertChannel,
} = require('../../common/discord/discordService');
const logger = require('../statsLogger.js');

let generateStatsSchedulerSetting = '00 10 * * * *';

if (config.has('trigger_scheduler.generate_stats')) {
    generateStatsSchedulerSetting = config.get(
        'trigger_scheduler.generate_stats'
    );
}

async function generateStatsFile() {
    schedule.scheduleJob(generateStatsSchedulerSetting, async () => {
        try {
            logger.info('start generate stats');
            const statsFilename = await generateGroStatsFile();
            logger.info(`generate stats file: ${statsFilename}`);
        } catch (error) {
            sendMessageToAlertChannel(error);
        }
    });
}

function starStatsJobs() {
    generateStatsFile();
}

module.exports = {
    starStatsJobs,
};
