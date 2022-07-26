import fs from 'fs';
import path from 'path';
import schedule from 'node-schedule';
import { generateGroStatsFile } from '../handler/statsHandler';
import { getConfig } from '../../common/configUtil';
import { checkServerHealth } from '../../common/checkBotHealth';
import { sendErrorMessageToLogChannel } from '../../common/discord/discordService';
import {
    getLastBlockNumber,
    generateDepositAndWithdrawReport,
    updateLastBlockNumber,
    generateSummaryReport,
} from '../handler/eventHandler';
import { getCurrentBlockNumber } from '../../common/chainUtil';
import { getAvaxSystemStats } from '../handler/avaxSystemHandler';
import { generateGroStatsMcFile } from '../handler/mcStatsHandler';
import { sendAlertMessage } from '../../common/alertMessageSender';
import { getValidContractHistoryEventFilters } from '../../common/filterGenerateTool';

const logger = require('../statsLogger');

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

const failedAlertTimes = getConfig('call_failed_time', false) || 2;
const failedTimes = { apyGenerator: 0, eventTrade: 0, eventSumary: 0 };

const eventDiscordMessageSending = getConfig('stats_bot_event_sending', false);

async function generateStatsFile() {
    schedule.scheduleJob(generateStatsSchedulerSetting, async () => {
        try {
            logger.info('start generate stats');
            const statsFilename = await generateGroStatsMcFile();
            logger.info(`generate stats file: ${statsFilename}`);
            failedTimes.apyGenerator = 0;
        } catch (error) {
            sendErrorMessageToLogChannel(error);
            failedTimes.apyGenerator += 1;
            if (failedTimes.apyGenerator >= failedAlertTimes) {
                sendAlertMessage({
                    discord: {
                        description:
                            '[WARN] B5 - Gro stats generation failed, didn’t produce json file',
                    },
                });
            }
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
                const externalFiles = [];
                statsFiles.forEach((item) => {
                    if (item.indexOf('gro') > -1) {
                        groApyFiles.push(item);
                    } else if (item.indexOf('argent') > -1) {
                        argentApyFiles.push(item);
                    } else if (item.indexOf('external') > -1) {
                        externalFiles.push(item);
                    }
                });
                // remove gro apy files
                removeFile(groApyFiles, 'gro-stats');

                // remove argent files
                removeFile(argentApyFiles, 'argent');

                // remove external files
                removeFile(externalFiles, 'external');
            } else {
                logger.error(`${statsDir} folder doesn't exist.`);
            }
        } catch (error) {
            logger.error(error);
        }
    });
}

function depositWithdrawEventScheduler() {
    if (!eventDiscordMessageSending) return;
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
            failedTimes.eventTrade = 0;
        } catch (error) {
            failedTimes.eventTrade += 1;
            sendErrorMessageToLogChannel(error);
            if (failedTimes.eventTrade > failedAlertTimes) {
                sendAlertMessage({
                    discord: {
                        description:
                            "[WARN] B16 - Trade trace monitor txn failed, trade update messages didn't generate",
                    },
                });
            }
        }
    });
}

function EventSummaryScheduler() {
    if (!eventDiscordMessageSending) return;
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
            failedTimes.eventSumary = 0;
        } catch (error) {
            failedTimes.eventSumary += 1;
            sendErrorMessageToLogChannel(error);
            if (failedTimes.eventSumary > failedAlertTimes) {
                sendAlertMessage({
                    discord: {
                        description:
                            "[WARN] B17 - Trade summary monitor txn failed, trade summary didn't generate",
                    },
                });
            }
        }
    });
}

function botLiveCheckScheduler() {
    schedule.scheduleJob(generateStatsSchedulerSetting, async () => {
        logger.info(`bot live check running at ${Date.now()}`);
        try {
            const criticUrl = getConfig('health_endpoint.critic', false);
            checkServerHealth('critic', [criticUrl], logger).catch((e) => {
                logger.error(e);
            });
            const harvestUrl = getConfig('health_endpoint.harvest', false);
            checkServerHealth('harvest', [harvestUrl], logger).catch((e) => {
                logger.error(e);
            });
        } catch (error) {
            logger.error(error);
        }
    });
}

function starStatsJobs() {
    // generateStatsFile();
    // removeStatsFile();
    // depositWithdrawEventScheduler();
    // // EventSummaryScheduler();
    // botLiveCheckScheduler();
}

export { starStatsJobs };
