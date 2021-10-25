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
const {
    getGroVault,
    getPowerD,
    getTokenCounter,
} = require('../common/contractUtil');
const { QUERY_ERROR } = require('../constants');
const { getBalances } = require('../common/balanceUtil');



/// dev: ****** TokenCounter only available in mainnet from 21/10/2021
const loadUserBalances2 = async () => {
    try {

        const GVT_ADDRESS = await getGroVault().address;
        const PWRD_ADDRESS = await getPowerD().address;
        const GRO_ADDRESS = '0x3Ec8798B81485A254928B70CDA1cf0A2BB0B74D7';
        const CRV_POOL_ADDRESS = '0xbcb91E689114B9Cc865AD7871845C95241Df4105';

        const res1 = await getBalances(
            GVT_ADDRESS,
            ['0xBCc4C6Fb05Ff417398289D228C095352dcFa5c5E'], // MAT
            // ['0x60ff7DcB4a9c1a89B18Fa2D1Bb9444143BbEA9BD'], // SJS
            // ['0xd212B36369Df04CF29e744d978D5ACA035280360'],
            13464125  // EOD 21/10/2021
        );

        const res2 = await getBalances(
            PWRD_ADDRESS,
            ['0xBCc4C6Fb05Ff417398289D228C095352dcFa5c5E'], // MAT
            // ['0x60ff7DcB4a9c1a89B18Fa2D1Bb9444143BbEA9BD'], // SJS
            // ['0xd212B36369Df04CF29e744d978D5ACA035280360'],
            13464125  // EOD 21/10/2021
        );

        const res3a = parseAmount(await getGroVault().getAssets(
            '0xBCc4C6Fb05Ff417398289D228C095352dcFa5c5E', // MAT
            // '0x60ff7DcB4a9c1a89B18Fa2D1Bb9444143BbEA9BD', // SJS
            // ['0xd212B36369Df04CF29e744d978D5ACA035280360'],
            { blockTag: 13464125 }),
            'USD');

        const res3b = parseAmount(await getPowerD().getAssets(
            '0xBCc4C6Fb05Ff417398289D228C095352dcFa5c5E', // MAT
            // '0x60ff7DcB4a9c1a89B18Fa2D1Bb9444143BbEA9BD', // SJS
            // ['0xd212B36369Df04CF29e744d978D5ACA035280360'],
            { blockTag: 13464125 }),
            'USD');

        const res4 = await getBalances(
            CRV_POOL_ADDRESS,
            ['0xBCc4C6Fb05Ff417398289D228C095352dcFa5c5E'], // MAT
            // ['0x60ff7DcB4a9c1a89B18Fa2D1Bb9444143BbEA9BD'], // SJS
            // ['0xd212B36369Df04CF29e744d978D5ACA035280360'],
            13464125  // EOD 21/10/2021
        );

        const res5 = await getBalances(
            GRO_ADDRESS,
            ['0xBCc4C6Fb05Ff417398289D228C095352dcFa5c5E'], // MAT
            // ['0x60ff7DcB4a9c1a89B18Fa2D1Bb9444143BbEA9BD'], // SJS
            // ['0xd212B36369Df04CF29e744d978D5ACA035280360'],
            13464125  // EOD 21/10/2021
        );

        console.log('gvt', res1);
        console.log('old gvt', res3a);
        console.log('pwrd', res2);
        console.log('old pwrd', res3b);
        console.log('pwrd crv', res4);
        console.log('gro', res5);

    } catch (err) {
        console.log('Errorin', err);
    }


}


/// @notice Load balances into USER_STD_FACT_BALANCES
/// @dev    Data is sourced from SC calls to users' balances at a certain block number
///         according to the dates provided
/// @param  fromDate Start date to load balances (date format: 'DD/MM/YYYY')
/// @param  toDdate End date to load balances (date format: 'DD/MM/YYYY')
/// @param  account User address for cache loading; null for daily loads
/// @return True if no exceptions found, false otherwise
const loadUserBalances4 = async (
    fromDate,
    toDate,
    account,
) => {
    try {
        // Get all distinct users with any transfer
        let res;
        let users;
        if (account) {
            res = {
                rowCount: 1,
                rows: [{
                    user_address: account
                }],
            }
        } else {
            res = await query('select_distinct_users_transfers.sql', []);
            if (res.status === QUERY_ERROR)
                return false;
        }

        // Extract value from object
        users = res.rows.map(key => key.user_address);

        // For each date, check each gvt & pwrd balance and insert data into USER_STD_FACT_BALANCES
        // TODO: *** select transfers where date < target date (for future data reloads)
        const dates = generateDateRange(fromDate, toDate);
        logger.info(`**DB${account ? ' CACHE' : ''}: Processing ${res.rowCount} user balance${isPlural(res.rowCount)}...`);

        for (const date of dates) {

            const day = moment.utc(date, "DD/MM/YYYY")
                .add(23, 'hours')
                .add(59, 'minutes')
                .add(59, 'seconds');

            let rowCount = 0;
            let rowExcluded = 0;

            const GVT_ADDRESS = await getGroVault().address;
            const PWRD_ADDRESS = await getPowerD().address;
            const block = (await findBlockByDate(day, false)).block;

            const gvtValue = await getBalances(
                GVT_ADDRESS,
                users,
                block,
            );

            const pwrdValue = await getBalances(
                PWRD_ADDRESS,
                users,
                block,
            );

            for (let i = 0; i < users.length; i++) {
                const addr = users[i];
                // const gvtValue = parseAmount(await getGroVault().getAssets(addr, blockTag), 'USD');
                // const pwrdValue = parseAmount(await getPowerD().getAssets(addr, blockTag), 'USD');
                const totalValue = gvtValue[i] + pwrdValue[i];
                const params = [
                    day,
                    getNetworkId(),
                    addr,
                    totalValue,
                    gvtValue[i],
                    pwrdValue[i],
                    moment.utc()
                ];
                // zero balance accounts are excluded
                if (totalValue !== 0) {
                    const q = (account)
                        ? 'insert_user_cache_fact_balances.sql'
                        : 'insert_user_std_fact_balances.sql';
                    const result = await query(q, params);
                    if (result.status === QUERY_ERROR)
                        return false;
                    rowCount += result.rowCount;
                } else {
                    rowExcluded++;
                }
            }
            let msg = `**DB${account ? ' CACHE' : ''}: ${rowCount} record${isPlural(rowCount)} `;
            msg += `added into USER_STD_FACT_BALANCES `;
            msg += (rowExcluded !== 0) ? ` (excluded ${rowExcluded} with 0-balance) ` : '';
            msg += `for date ${moment(date).format('DD/MM/YYYY')}`;
            logger.info(msg);
        }
        // Update table SYS_USER_LOADS with the last loads
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
    loadUserBalances2,
};
