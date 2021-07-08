const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
const { query } = require('../handler/queryHandler');
const { loadEthBlocks } = require('./loadEthBlocks');
const { loadTableUpdates } = require('./loadTableUpdates');
const {
    QUERY_ERROR,
    findBlockByDate,
    generateDateRange,
    getNetworkId,
    handleErr,
    isDeposit,
    isPlural,
    getTransferEvents2,
} = require('../common/personalUtil');
const {
    parseAmount,
} = require('../common/personalParser');
const {
    getGvt,
    getPwrd,
} = require('../../contract/allContracts');


/// @notice Loads balances into USER_BALANCES
/// @dev Data is sourced from smart contract calls to user's balances at a certain block number
///      according to the dates provided
/// @param fromDate Start date to load balances
/// @param toDdate End date to load balances
/// @return True if no exceptions found, false otherwise
const loadUserBalances = async (
    fromDate,
    toDate,
) => {
    try {
        // Get users with any transfer
        const users = await query('select_distinct_users_transfers.sql', []);
        if (users === QUERY_ERROR) return false;

        // For each date, check gvt & pwrd balance and insert data into USER_BALANCES
        const dates = generateDateRange(fromDate, toDate);
        logger.info(`**DB: Processing ${users.rowCount} user balance${isPlural(users.rowCount)}...`);
        for (const date of dates) {
            const day = moment.utc(date, "DD/MM/YYYY")
                .add(23, 'hours')
                .add(59, 'minutes')
                .add(59, 'seconds');
            const blockTag = {
                blockTag: (await findBlockByDate(day)).block
            }
            let rowCount = 0;
            for (const user of users.rows) {
                const account = user.user_address;
                const gvtValue = parseAmount(await getGvt().getAssets(account, blockTag), 'USD');
                const pwrdValue = parseAmount(await getPwrd().getAssets(account, blockTag), 'USD');
                const totalValue = gvtValue + pwrdValue;
                const params = [
                    day,
                    getNetworkId(),
                    account,
                    totalValue,
                    gvtValue,
                    pwrdValue,
                    moment.utc()
                ];
                const result = await query('insert_user_balances.sql', params);
                if (result === QUERY_ERROR) return false;
                rowCount += result.rowCount;
            }
            let msg = `**DB: ${rowCount} record${isPlural(rowCount)} added into `;
            msg += `USER_BALANCES for date ${moment(date).format('DD/MM/YYYY')}`;
            logger.info(msg);
        }
        const res = await loadTableUpdates('USER_BALANCES', fromDate, toDate);
        return (res) ? true : false;
    } catch (err) {
        handleErr(`loadUserBalances->loadUserBalances() [from: ${fromDate}, to: ${toDate}]`, err);
        return false;
    }
}

module.exports = {
    loadUserBalances,
};