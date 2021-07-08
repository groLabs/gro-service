const ethers = require('ethers');
const { query } = require('../handler/queryHandler');
const { getPersonalStats } = require('../handler/personalHandler');
const {
    initDatabaseContracts,
    initAllContracts,
    getGvt,
    getPwrd,
    // getBuoy,
    // getDepositHandler,
    //getVaultStabeCoins,
} = require('../../contract/allContracts');
const {
    getDefaultProvider,
    // getAlchemyRpcProvider,
} = require('../../common/chainUtil');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const moment = require('moment');
const {
    QUERY_ERROR,
    getBlockData,
    getNetworkId,
    getStableCoinIndex,
    generateDateRange,
    getApprovalEvents2,
    getTransferEvents2,
    getGTokenFromTx,
    handleErr,
    isDeposit,
    isPlural,
    Transfer,
    transferType,
    findBlockByDate,
} = require('../common/personalUtil');
const {
    parseAmount,
    parseApprovalEvents,
    parseTransferEvents,
} = require('../common/personalParser');
const { loadEthBlocks } = require('./loadEthBlocks');
const { loadTableUpdates } = require('./loadTableUpdates');
const {
    loadUserTransfers,
    loadTmpUserTransfers,
} = require('./loadUserTransfers.js');
const {
    loadUserApprovals,
    loadTmpUserApprovals,
} = require('./loadUserApprovals.js');
const { loadUserBalances } = require('./loadUserBalances');
const { loadUserNetReturns } = require('./loadUserNetReturns');



/// @notice Truncates temporaty tables & calculates blocks and dates to be processed
/// @param fromDate Start date to process data
/// @param toDdate End date to process data
/// @return Array with start block, end block and list of dates to be processed
const preload = async (_fromDate, _toDate) => {
    try {
        // Truncate temporary table TMP_USER_DEPOSITS or TMP_USER_WITHDRAWALS
        // TODO *** Promise.all
        const res1 = await query('truncate_tmp_user_approvals.sql', []);
        const res2 = await query('truncate_tmp_user_deposits.sql', []);
        const res3 = await query('truncate_tmp_user_withdrawals.sql', []);
        if (res1 === QUERY_ERROR || res2 === QUERY_ERROR || res3 === QUERY_ERROR) return;

        // Calculate dates & blocks to process
        const dates = generateDateRange(_fromDate, _toDate);
        const fromDate = dates[0].clone();
        const toDate = dates[dates.length - 1]
            .utc()
            .clone()
            .add(23, 'hours')
            .add(59, 'seconds')
            .add(59, 'minutes');
        const fromBlock = (await findBlockByDate(fromDate)).block;
        const toBlock = (await findBlockByDate(toDate)).block;

        return [fromBlock, toBlock, dates];

    } catch (err) {
        handleErr(`personalHandler->preload() [from: ${_fromDate}, to: ${_toDate}]`, err);
        return [];
    }
}

/// @notice Deletes transfers, approvals, balances and net returns for the given dates interval
/// @param fromDate Start date to delete data
/// @param toDdate End date to delete data
/// @return True if no exceptions found, false otherwise
const remove = async (fromDate, toDate) => {
    try {
        /// @dev: Note that format 'MM/DD/YYYY' has to be set to compare dates <= or >= (won't work with 'DD/MM/YYYY')
        const fromDateParsed = moment(fromDate, 'DD/MM/YYYY').format('MM/DD/YYYY');
        const toDateParsed = moment(toDate, 'DD/MM/YYYY').format('MM/DD/YYYY');
        const params = [fromDateParsed, toDateParsed];
        const [
            transfers,
            balances,
            netReturns,
            approvals,
            loads,
        ] = await Promise.all([
            query('delete_user_transfers.sql', params),
            query('delete_user_balances.sql', params),
            query('delete_user_net_returns.sql', params),
            query('delete_user_approvals.sql', params),
            query('delete_table_loads.sql', params),
        ]);

        if (transfers
            && balances
            && netReturns
            && approvals
            && loads) {
            logger.info(`**DB: ${transfers.rowCount} record${isPlural(transfers.rowCount)} deleted from USER_TRANSFERS`);
            logger.info(`**DB: ${balances.rowCount} record${isPlural(balances.rowCount)} deleted from USER_BALANCES`);
            logger.info(`**DB: ${netReturns.rowCount} record${isPlural(netReturns.rowCount)} deleted from USER_NET_RETURNS`);
            logger.info(`**DB: ${approvals.rowCount} record${isPlural(approvals.rowCount)} deleted from USER_APPROVALS`);
            logger.info(`**DB: ${loads.rowCount} record${isPlural(loads.rowCount)} deleted from SYS_TABLE_LOADS`);
        } else {
            const params = `Dates [${fromDate} - ${toDate}]`;
            handleErr(`personalHandler->remove() Delete query didn't return results. Params: ${params}`, null);
            return false;
        }
        return true;
    } catch (err) {
        handleErr(`personalHandler->remove() [from: ${fromDate}, to: ${toDate}]`, err);
        return false;
    }
}

// TODO (specially for mainnet)
const reloadApprovals = async () => {

}

/// @notice Reloads user transfers, balances & net results for a given time interval
/// @dev    - Previous data for the given time interval will be overwritten
/// @param fromDate Start date to reload data
/// @param toDdate End date to reload data
const reload = async (
    fromDate,
    toDate,
) => {
    try {
        // Truncates TMP tables and calculates dates & blocks to be processed
        const [fromBlock, toBlock, dates] = await preload(fromDate, toDate);

        // Reload transfers, balances & net results
        if (fromBlock > 0 && toBlock > 0 && dates) {
            const [
                deposits,
                withdrawals,
                ext_gvt_deposit,
                ext_pwrd_deposit,
                ext_gvt_withdrawal,
                ext_pwrd_withdrawal,
            ] = await Promise.all([
                loadTmpUserTransfers(fromBlock, toBlock, Transfer.DEPOSIT),
                loadTmpUserTransfers(fromBlock, toBlock, Transfer.WITHDRAWAL),
                loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_GVT_WITHDRAWAL),
                loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_GVT_DEPOSIT),
                loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_PWRD_WITHDRAWAL),
                loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_PWRD_DEPOSIT),
            ]);

            if (deposits
                && withdrawals
                && ext_gvt_deposit
                && ext_pwrd_deposit
                && ext_gvt_withdrawal
                && ext_pwrd_withdrawal) {
                if (await loadTmpUserApprovals(fromBlock, toBlock))
                    if (await remove(fromDate, toDate))
                        if (await loadUserTransfers(fromDate, toDate))
                            if (await loadUserApprovals(fromDate, toDate))
                                if (await loadUserBalances(fromDate, toDate))
                                    await loadUserNetReturns(fromDate, toDate);
            }
        } else {
            const params = `Blocks [${fromBlock} - ${toBlock}], Dates [${fromDate} - ${toDate}]`;
            handleErr(`personalHandler->reload() Error with parameters: ${params}`, null);
        }
    } catch (err) {
        handleErr(`personalHandler->reload() [from: ${fromDate}, to: ${toDate}]`, err);
    }
}

/// @notice Loads user transfers, balances & net results for a given time interval
/// @dev    - If previous data was loaded for the same interval, there will be errors
///         referring to duplicated primary key
///         - If any data load fails, execution is stopped (to avoid data inconsistency)
/// @param fromDate Start date to reload data
/// @param toDdate End date to reload data
const load = async (
    fromDate,
    toDate,
) => {
    // Truncates TMP tables and calculate dates & blocks to be processed
    const [fromBlock, toBlock] = await preload(fromDate, toDate);

    // Reload transfers, balances & net results
    if (fromBlock > 0 && toBlock > 0) {
        const [
            deposits,
            withdrawals,
            ext_gvt_deposit,
            ext_pwrd_deposit,
            ext_gvt_withdrawal,
            ext_pwrd_withdrawal,
        ] = await Promise.all([
            loadTmpUserTransfers(fromBlock, toBlock, Transfer.DEPOSIT),
            loadTmpUserTransfers(fromBlock, toBlock, Transfer.WITHDRAWAL),
            loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_GVT_WITHDRAWAL),
            loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_GVT_DEPOSIT),
            loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_PWRD_WITHDRAWAL),
            loadTmpUserTransfers(fromBlock, toBlock, Transfer.EXTERNAL_PWRD_DEPOSIT),
        ]);

        if (deposits
            && withdrawals
            && ext_gvt_deposit
            && ext_pwrd_deposit
            && ext_gvt_withdrawal
            && ext_pwrd_withdrawal) {
            if (await loadTmpUserApprovals(fromBlock, toBlock))
                if (await loadUserTransfers(fromDate, toDate))
                    if (await loadUserApprovals(fromDate, toDate))
                        if (await loadUserBalances(fromDate, toDate))
                            await loadUserNetReturns(fromDate, toDate);
        }
    } else {
        const params = `Blocks [${fromBlock} - ${toBlock}], Dates [${fromDate} - ${toDate}]`;
        handleErr(`personalHandler->reload() Error with parameters: ${params}`, null);
    }
}

const loadGroStatsDB = async () => {
    try {
        initAllContracts().then(async () => {
            //DEV Ropsten:
            await reload('27/06/2021', '30/06/2021');
            // await reload('27/06/2021', '30/06/2021');
            // await load('27/06/2021', '30/06/2021');

            // PROD:
            // await reload("02/07/2021", "04/07/2021");
            process.exit(); // for testing purposes
        });
        // JSON tests
        // const res = await getPersonalStats('06/07/2021', '0xb5bE4d2510294d0BA77214F26F704d2956a99072');
        // console.log(res);
        // console.log('yo')
        // process.exit();
    } catch (err) {
        handleErr(`personalHandler->loadGroStatsDB()`, err);
    }
}

module.exports = {
    loadGroStatsDB,
};





// Calculate the PWRD value based on the ratio in the block when the deposit/withdrawal was performed
// Note from Kristian: pwrds factor is not applied to price, only GVT. So no need to apply this conversion
// const getPwrdValue = async (result) => {
//     try {
//         for (const item of result) {
//             if (item.pwrd_amount !== 0) {
//                 const blockTag = {
//                     blockTag: item.block_number
//                 };
//                 const factor = parseAmount(await getPwrd().factor(blockTag), 'USD');
//                 if (factor > 0) { 
//                     item.pwrd_value = item.pwrd_amount / factor;
//                 } else {
//                     handleErr(`personalHandler->getPwrdValue(): factor for PWRD is 0`, null);
//                 }
//                 console.log(factor, item)
//             }
//         }
//     } catch(err) {
//         handleErr(`personalHandler->getPwrdValue():`, null);
//     }
// }

// const isGToken = (tokenSymbol) => {
//     return (['DAI', 'USDC', 'USDT'].includes(tokenSymbol)) ? false : true;
// }

/* EXPERIMENTAL */
/*
const showBalanceHourBlock = async (date, account) => {
    try {
        // let start = moment.utc("19/06/2021", "DD/MM/YYYY");
        // //const days = moment.duration(end.diff(start)).asDays();

        // let dates = [];
        // for (let i = 0; i <= 23; i++) {
        //     let newDate = moment(start).add(i, 'hours');
        //     //let newDateStr = moment(newDate).format('DD/MM/YYYY HH24:MI:SS');
        //     //console.log(newDateStr);
        //     //await reload(newDateStr, newDateStr, null);
        //     dates.push(newDate);
        // }

        // for (const date of dates) {
        //     const blockTag = {
        //         blockTag: (await findBlockByDate(date)).block
        //     }
        //     console.log(blockTag.blockTag)

        //     const gvtValue = parseAmount(await getGvt().getAssets(account, blockTag), 'USD');
        //     const pwrdValue = parseAmount(await getPwrd().getAssets(account, blockTag), 'USD');
        //     const totalValue = gvtValue + pwrdValue;
        //     const block = blockTag.blockTag;
        //     const params = {
        //         block: block,
        //         date : date,
        //         networkid: getNetworkId(),
        //         account: account,
        //         totalValue: totalValue,
        //         gvtValue: gvtValue,
        //         pwrdValue: pwrdValue,
        //     };
        //     // const result = await query('insert_user_balances.sql', params);
        //     // if (result === QUERY_ERROR) return false;
        //     // rowCount += result.rowCount;
        //     console.log(params);
        // }

        const blockTag = {
            blockTag: 25582733
        };
        const gvtValue = parseAmount(await getGvt().getAssets(account, blockTag), 'USD');
        const pwrdValue = parseAmount(await getPwrd().getAssets(account, blockTag), 'USD');
        const totalValue = gvtValue + pwrdValue;
        const params = {
            block: blockTag.blockTag,
            date: date,
            networkid: getNetworkId(),
            account: account,
            totalValue: totalValue,
            gvtValue: gvtValue,
            pwrdValue: pwrdValue,
        };
        console.log(params);
    } catch (err) {
        handleErr(`personalHandler->showBalanceHourBlock()`, err);
    }
}
*/