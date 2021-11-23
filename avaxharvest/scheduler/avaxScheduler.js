const schedule = require('node-schedule');
const {
    sendErrorMessageToLogChannel,
} = require('../../dist/common/discord/discordService');
const { forceClose } = require('../handler/borrowLimitHandler');
const { harvest } = require('../handler/harvestHandler');
const { tend } = require('../handler/tendHandler');

const { getVaults } = require('../contract/avaxAllContracts');
const { getConfig } = require('../../dist/common/configUtil');
const tendSchedulerSetting = getConfig('trigger_scheduler.tend', false);
const harvestSchedulerSetting = getConfig('trigger_scheduler.harvest', false);
const forceCloseSchedulerSetting = getConfig(
    'trigger_scheduler.force_close',
    false
);

function harvestScheduler() {
    console.log('start harvest');
    schedule.scheduleJob(harvestSchedulerSetting, async () => {
        try {
            const vaults = getVaults();
            console.log(`length ${vaults.length}`);
            const txs = [];
            for (let i = 0; i < vaults.length; i += 1) {
                console.log(
                    `address ${i} ${vaults[i].vaultAdaptorMK2.address}`
                );
                txs.push(harvest(vaults[i]));
            }
            await txs;
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

function tendScheduler() {
    console.log('start tend');
    schedule.scheduleJob(tendSchedulerSetting, async () => {
        try {
            const vaults = getVaults();
            const txs = [];
            for (let i = 0; i < vaults.length; i += 1) {
                txs.push(tend(vaults[i]));
            }
            await txs;
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

function forceCloseScheduler() {
    console.log('start forceclose');
    schedule.scheduleJob(forceCloseSchedulerSetting, async () => {
        try {
            const vaults = getVaults();
            const txs = [];
            for (let i = 0; i < vaults.length; i += 1) {
                txs.push(forceClose(vaults[i]));
            }
            await txs;
        } catch (error) {
            sendErrorMessageToLogChannel(error);
            const discordMessage = {
                description:
                    "[WARN] B2 -  HarvestTrigger | Harvest txn failed, HarvestTrigger action didn't complate",
            };
        }
    });
}

function startHarvestJobs() {
    harvestScheduler();
    tendScheduler();
    forceCloseScheduler();
}

module.exports = {
    startHarvestJobs,
};
