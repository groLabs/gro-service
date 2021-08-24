const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
const { query } = require('../handler/queryHandler');
const { loadEthBlocks } = require('./loadEthBlocks');
const { loadTableUpdates } = require('./loadTableUpdates');
const { findBlockByDate } = require('../common/globalUtil');
const {
    generateDateRange,
    getNetworkId,
    handleErr,
    isPlural,
} = require('../common/personalUtil');
const {
    parseAmount,
} = require('../parser/personalStatsParser');
const providerKey = 'stats_personal';
const { ContractNames } = require('../../registry/registry');
const { getLatestSystemContract } = require('../../stats/common/contractStorage');
const { QUERY_ERROR } = require('../constants');


function getLatestGroVault() {
    return getLatestSystemContract(ContractNames.groVault, providerKey)
        .contract;
}

function getLatestPowerD() {
    return getLatestSystemContract(ContractNames.powerD, providerKey)
        .contract;
}

/// @notice Loads balances into USER_BALANCES
/// @dev Data is sourced from smart contract calls to user's balances at a certain block number
///      according to the dates provided
/// @param fromDate Start date to load balances
/// @param toDdate End date to load balances
/// @param account User address for cache loading; null for daily loads
/// @return True if no exceptions found, false otherwise
const loadUserBalances = async (
    fromDate,
    toDate,
    account,
) => {
    try {
        // Get users with any transfer
        let users;
        if (account) {
            users = {
                rowCount: 1,
                rows: [{
                    user_address: account
                }],
            }
        } else {
            users = await query('select_distinct_users_transfers.sql', []);
            if (users.status === QUERY_ERROR)
                return false;
        }

        // For each date, check gvt & pwrd balance and insert data into USER_STD_FACT_BALANCES
        const dates = generateDateRange(fromDate, toDate);
        logger.info(`**DB${account ? ' CACHE' : ''}: Processing ${users.rowCount} user balance${isPlural(users.rowCount)}...`);
        for (const date of dates) {
            const day = moment.utc(date, "DD/MM/YYYY")
                .add(23, 'hours')
                .add(59, 'minutes')
                .add(59, 'seconds');
            const blockTag = {
                blockTag: (await findBlockByDate(day, false)).block
            }
            let rowCount = 0;
            for (const user of users.rows) {
                const addr = user.user_address;
                // const gvtValue = parseAmount(await getGvt().getAssets(account, blockTag), 'USD');
                // const pwrdValue = parseAmount(await getPwrd().getAssets(account, blockTag), 'USD');
                const gvtValue = parseAmount(await getLatestGroVault().getAssets(addr, blockTag), 'USD');
                const pwrdValue = parseAmount(await getLatestPowerD().getAssets(addr, blockTag), 'USD');
                const totalValue = gvtValue + pwrdValue;
                const params = [
                    day,
                    getNetworkId(),
                    addr,
                    totalValue,
                    gvtValue,
                    pwrdValue,
                    moment.utc()
                ];
                const q = (account)
                    // ? 'insert_cache_user_balances.sql'
                    ? 'insert_user_cache_fact_balances.sql'
                    // : 'insert_user_balances.sql';
                    : 'insert_user_std_fact_balances.sql';
                const result = await query(q, params);
                if (result.status === QUERY_ERROR)
                    return false;
                rowCount += result.rowCount;
            }
            let msg = `**DB${account ? ' CACHE' : ''}: ${rowCount} record${isPlural(rowCount)} added into `;
            msg += `USER_STD_FACT_BALANCES for date ${moment(date).format('DD/MM/YYYY')}`;
            logger.info(msg);
        }

        if (account) {
            return true;
        } else {
            const res = await loadTableUpdates('USER_STD_FACT_BALANCES', fromDate, toDate);
            return (res) ? true : false;
        }
    } catch (err) {
        handleErr(`loadUserBalances->loadUserBalances() [from: ${fromDate}, to: ${toDate}]`, err);
        return false;
    }
}

module.exports = {
    loadUserBalances,
};
