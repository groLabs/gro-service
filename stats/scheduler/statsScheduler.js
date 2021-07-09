const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const { generateGroStatsFile } = require('../handler/statsHandler-new');
const { getConfig } = require('../../common/configUtil');
const {
    sendMessageToAlertChannel,
} = require('../../common/discord/discordService');
const {
    getLastBlockNumber,
    generateDepositAndWithdrawReport,
    updateLastBlockNumber,
    generateSummaryReport,
} = require('../handler/eventHandler-new');
const { getCurrentBlockNumber } = require('../../common/chainUtil');
const logger = require('../statsLogger.js');

const statsDir = getConfig('stats_folder');
const generateStatsSchedulerSetting =
    getConfig('trigger_scheduler.generate_stats', false) || '00 10 * * * *';
const removeStatsFileSchedulerSetting =
    getConfig('trigger_scheduler.remove_stats_file', false) || '00 * * * * *';
const keepStatsFileNumber = getConfig('keep_stats_file_number', false) || 25;
const depositWithdrawEventSchedulerSetting =
    getConfig('trigger_scheduler.deposit_withdraw_event', false) ||
    '*/5 * * * *';
const eventSummarySchedulerSetting =
    getConfig('trigger_scheduler.event_summary', false) || '00 * * * *';

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

function removeFile(fileNameList, removedFilePrefix) {
    const fileSize = fileNameList.length;
    logger.info(`Currect file size: ${fileSize}`);
    if (fileSize <= keepStatsFileNumber) {
        logger.info(`No need remove files, currect file size: ${fileSize}`);
        return;
    }
    fileNameList.sort(
        (a, b) =>
            fs.statSync(path.join(statsDir, b)).ctime.getTime() -
            fs.statSync(path.join(statsDir, a)).ctime.getTime()
    );
    const removedFileNames = fileNameList.slice(keepStatsFileNumber);
    let removedFilesCount = 0;
    removedFileNames.forEach((item) => {
        if (item.indexOf(removedFilePrefix) > -1) {
            fs.unlinkSync(path.join(statsDir, item));
            removedFilesCount += 1;
        }
    });

    logger.info(`Removed ${removedFilesCount} stats files.`);
}

async function removeStatsFile() {
    schedule.scheduleJob(removeStatsFileSchedulerSetting, async () => {
        try {
            logger.info('Start remove stats file.');
            if (fs.existsSync(statsDir)) {
                const statsFiles = fs.readdirSync(statsDir);
                const groApyFiles = [];
                const argentApyFiles = [];
                statsFiles.forEach((item) => {
                    if (item.indexOf('gro') > -1) {
                        groApyFiles.push(item);
                    } else if (item.indexOf('argent') > -1) {
                        argentApyFiles.push(item);
                    }
                });
                // remove gro apy files
                removeFile(groApyFiles, 'gro-stats');

                // remove argent files
                removeFile(argentApyFiles, 'argent');
            } else {
                logger.error(`${statsDir} folder doesn't exist.`);
            }
        } catch (error) {
            logger.error(error);
        }
    });
}

function depositWithdrawEventScheduler() {
    schedule.scheduleJob(depositWithdrawEventSchedulerSetting, async () => {
        try {
            const lastBlockNumber = getLastBlockNumber(
                'lastDepositAndWithdrawBlockNumber'
            );
            const currectBlockNumber = await getCurrentBlockNumber();
            if (!currectBlockNumber) return;
            await Promise.all([
                generateDepositAndWithdrawReport(
                    lastBlockNumber,
                    currectBlockNumber
                ),
            ]);
            updateLastBlockNumber(
                currectBlockNumber,
                'lastDepositAndWithdrawBlockNumber'
            );
        } catch (error) {
            sendMessageToAlertChannel(error);
        }
    });
}

function EventSummaryScheduler() {
    schedule.scheduleJob(eventSummarySchedulerSetting, async () => {
        try {
            const lastBlockNumber = getLastBlockNumber(
                'lastSummaryBlockNumber'
            );
            const currectBlockNumber = await getCurrentBlockNumber();
            if (!currectBlockNumber) return;
            await Promise.all([
                generateSummaryReport(lastBlockNumber, currectBlockNumber),
            ]);
            updateLastBlockNumber(currectBlockNumber, 'lastSummaryBlockNumber');
        } catch (error) {
            sendMessageToAlertChannel(error);
        }
    });
}

function starStatsJobs() {
    generateStatsFile();
    removeStatsFile();
    depositWithdrawEventScheduler();
    EventSummaryScheduler();
}

module.exports = {
    starStatsJobs,
};
