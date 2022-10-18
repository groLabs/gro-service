import schedule from 'node-schedule';
import { getConfig } from '../../common/configUtil';
import { etlGroStatsMC } from '../etl/etlGroStatsMC';
import { etlPriceCheck } from '../etl/etlPriceCheck';
import { etlTokenPrice } from '../etl/etlTokenPrice';
import { etlVestingBonus } from '../etl/etlVestingBonus';
import { etlPersonalStats } from '../etl/etlPersonalStats';
import { calcLoadingDateRange } from '../common/personalUtil';
import { loadContractInfoFromRegistry } from '../../registry/registryLoader';
const groStatsJobSetting =
    // getConfig('trigger_scheduler.db_gro_stats', false) || '*/30 * * * * *';  // 30 seconds [TESTING]
    getConfig('trigger_scheduler.db_gro_stats', false) || '*/3 * * * *'; // 3 mins [PRODUCTION]
const priceCheckJobSetting =
    // getConfig('trigger_scheduler.db_price_check', false) || '*/30 * * * * *';  // 30 seconds [TESTING]
    getConfig('trigger_scheduler.db_price_check', false) || '*/30 * * * *'; // 30 mins [PRODUCTION]
const personalStatsJobSetting =
    // getConfig('trigger_scheduler.db_personal_stats', false) || '*/120 * * * * *'; // X seconds [TESTING]
    getConfig('trigger_scheduler.db_personal_stats', false) || '5 0 * * *'; // everyday at 00:05 AM [PRODUCTION]
const tokenPriceSetting =
    // getConfig('trigger_scheduler.db_token_price', false) || '*/30 * * * * *';  // 30 seconds [TESTING]
    getConfig('trigger_scheduler.db_token_price', false) || '*/5 * * * *'; // 5 mins [PRODUCTION]
const vestingBonusSetting =
    // getConfig('trigger_scheduler.db_vesting_bonus', false) || '*/15 * * * * *';  // 30 seconds [TESTING]
    getConfig('trigger_scheduler.db_vesting_bonus', false) || '*/5 * * * *'; // 1 min [PRODUCTION]  ** TO BE CHANGED TO 1 MIN ONCE WE GO LIVE!
import {
    showInfo,
    showError,
} from '../handler/logHandler';
import {
    Bool,
    LoadType,
    NetworkName,
    GlobalNetwork,
} from '../types';
const nodeEnv = process.env.NODE_ENV.toLowerCase();


const groStatsJob = async () => {
    showInfo('groStatsJob initialised');
    schedule.scheduleJob(groStatsJobSetting, async () => {
        try {
            showInfo('groStatsJob started');
            await etlGroStatsMC();
            showInfo('groStatsJob finished');
        } catch (err) {
            showError('dbStatsScheduler.ts->groStatsJob()', err);
        }
    });
}

const priceCheckJob = async () => {
    showInfo('priceCheckJob initialised');
    schedule.scheduleJob(priceCheckJobSetting, async () => {
        try {
            showInfo('priceCheck started');
            await etlPriceCheck();
            showInfo('priceCheck finished');
        } catch (err) {
            showError('dbStatsScheduler.ts->priceCheckJob()', err);
        }
    });
}

const personalStatsJob = async () => {
    // await loadContractInfoFromRegistry();
    showInfo('personalStatsJob initialised');
    schedule.scheduleJob(personalStatsJobSetting, async () => {
        try {
            showInfo('personalStatsJob started');
            const res = await calcLoadingDateRange();
            if (res.length > 0) {
                showInfo(`Starting personal stats load (from: ${res[0]}, to: ${res[1]})`);
                await etlPersonalStats(
                    res[0],                 // start date 'DD/MM/YYYY'
                    res[1],                 // end date 'DD/MM/YYYY'
                    GlobalNetwork.ALL,      // load ETH & AVAX data
                    LoadType.ALL,           // load transfers & approvals
                );
            } else {
                showInfo(`No personal stats load required`);
            }
            showInfo('personalStatsJob finished');
        } catch (err) {
            showError('dbStatsScheduler.ts->personalStatsJob()', err);
        }
    });
}

const tokenPriceJob = async () => {
    showInfo('tokenPriceJob initialised');
    schedule.scheduleJob(tokenPriceSetting, async () => {
        try {
            showInfo('tokenPrice started');
            await etlTokenPrice();
            showInfo('tokenPrice finished');
        } catch (err) {
            showError('dbStatsScheduler.ts->tokenPriceJob()', err);
        }
    });
}

const vestingBonusJob = async () => {
    showInfo('vestingBonusJob initialised');
    schedule.scheduleJob(vestingBonusSetting, async () => {
        try {
            await etlVestingBonus(Bool.FALSE);
        } catch (err) {
            showError('dbStatsScheduler.ts->vestingBonusJob()', err);
        }
    });
}

const startDbStatsJobs = async () => {
    // //TODO: capture exception if contract load fails
    // await loadContractInfoFromRegistry();
    // groStatsJob();
    // priceCheckJob();
    // tokenPriceJob();
    // //vestingBonusJob();

    if (nodeEnv === NetworkName.ROPSTEN) {
        groStatsJob();
    } else {
        await loadContractInfoFromRegistry();
        groStatsJob();
        priceCheckJob();
        tokenPriceJob();
    }
}

export {
    startDbStatsJobs,
};
