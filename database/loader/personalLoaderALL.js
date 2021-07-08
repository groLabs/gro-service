/* TO BE IMPLEMENTED */

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

// **** TODO ***: preload and preloadCache (don't try to merge both into one single preload)
const preload = async (_fromDate, _toDate, account) => {
    // Truncate temporary tables for HISTORICAL data
    const [
        approvals,
        deposits,
        withdrawals,
    ] = await Promise.all([
        query('truncate_tmp_user_approvals.sql', []),
        query('truncate_tmp_user_deposits.sql', []),
        query('truncate_tmp_user_withdrawals.sql', []),
    ]);
    if (approvals === QUERY_ERROR || deposits === QUERY_ERROR || withdrawals === QUERY_ERROR)
        return [];
}

const load = async (
    fromDate,
    toDate,
    account,
) => {
    // Truncates TMP tables and calculate dates & blocks to be processed
    const [fromBlock, toBlock] = await preload(fromDate, toDate, account);
    console.log('fromBlock:', fromBlock, 'toBlock:', toBlock)
}

const loadGroStatsDBAll = async () => {
    try {
        initAllContracts().then(async () => {
            //DEV Ropsten:
            //await reload('27/06/2021', '30/06/2021');
            // await reload('27/06/2021', '30/06/2021');
            // await load('27/06/2021', '30/06/2021');
            console.log('hello');
            await load('27/06/2021', '30/06/2021', null);
            process.exit(); // for testing purposes
        });
        // JSON tests
        // const res = await getPersonalStats('29/06/2021', '0xb5bE4d2510294d0BA77214F26F704d2956a99072');
        // console.log(res);
        // console.log('yo')
        // process.exit();

    } catch (err) {
        handleErr(`personalLoaderALL->loadGroStatsDBAll()`, err);
    }
}

module.exports = {
    loadGroStatsDBAll,
};
