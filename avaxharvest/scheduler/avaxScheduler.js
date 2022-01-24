const schedule = require('node-schedule');
const {
    sendErrorMessageToLogChannel,
} = require('../../dist/common/discord/discordService');
const { forceClose } = require('../handler/borrowLimitHandler');
const { harvest } = require('../handler/harvestHandler');
const { checkAccountsBalance } = require('../common/avaxChainUtil');
const { getVaults } = require('../contract/avaxAllContracts');
const { getConfig } = require('../../dist/common/configUtil');
const harvestSchedulerSetting = getConfig('trigger_scheduler.harvest', false);
const forceCloseSchedulerSetting = getConfig(
    'trigger_scheduler.force_close',
    false
);
const botBalanceSchedulerSetting =
    getConfig('trigger_scheduler.bot_balance_check', false) || '20 * * * *';
const botBalanceWarnVault = getConfig('bot_balance', false) || {};

const logger = require('../avaxharvestLogger');

function harvestScheduler() {
    console.log('start harvest');
    schedule.scheduleJob(harvestSchedulerSetting, async () => {
        try {
            const vaults = getVaults();
            const txs = [];
            for (let i = 0; i < vaults.length; i += 1) {
                console.log(
                    `address ${i} ${vaults[i].vaultAdaptorMK2.address}`
                );
                txs.push(harvest(vaults[i]));
            }
            await Promise.all(txs);
        } catch (error) {
            sendErrorMessageToLogChannel(error);
            const discordMessage = {
                description:
                    "[WARN] B2 -  HarvestTrigger | Harvest txn failed, HarvestTrigger action didn't complate",
            };
            // sendAlertMessage({
            //     discord: discordMessage,
            // });
        }
    });
}

function checkBotAccountBalance() {
    schedule.scheduleJob(botBalanceSchedulerSetting, async () => {
        logger.info(`checkBotAccountBalance running at ${Date.now()}`);
        try {
            await checkAccountsBalance(botBalanceWarnVault);
        } catch (error) {
            sendErrorMessageToLogChannel(error);
        }
    });
}

function forceCloseScheduler() {
    console.log('start forceClose');
    schedule.scheduleJob(forceCloseSchedulerSetting, async () => {
        try {
            const vaults = getVaults();
            const txs = [];
            for (let i = 0; i < vaults.length; i += 1) {
                console.log(
                    `address ${i} ${vaults[i].vaultAdaptorMK2.address}`
                );
                txs.push(forceClose(vaults[i]));
            }
            await Promise.all(txs);
        } catch (error) {
            sendErrorMessageToLogChannel(error);
            const discordMessage = {
                description:
                    "[WARN] B2 -  HarvestTrigger | Harvest txn failed, HarvestTrigger action didn't complate",
            };
            // sendAlertMessage({
            //     discord: discordMessage,
            // });
        }
    });
}

function startHarvestJobs() {
    checkBotAccountBalance();
    // forceCloseScheduler();
    harvestScheduler();
}

module.exports = {
    startHarvestJobs,
};
