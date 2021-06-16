const ethers = require('ethers');
const { query, batchQuery } = require('./queryDBHandler');
const BN = require('bignumber.js');
const {
    initAllContracts,
    getGvt,
    getPwrd
} = require('../../contract/allContracts');
const { getConfig } = require('../../common/configUtil');
const { CONTRACT_ASSET_DECIMAL, div } = require('../../common/digitalUtil');
const {
    EVENT_TYPE,
    getEvents,
} = require('../../common/logFilter');
const {
    getDefaultProvider,
    getAlchemyRpcProvider
} = require('../../common/chainUtil');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const BlocksScanner = require('../../stats/common/blockscanner');


const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;
const ratioDecimal = getConfig('blockchain.ratio_decimal_place', false) || 4;

/*
TODO: 
1) create multiple DBHandlers.js to avoid a single file with too much code. E.g.:
    - statsDBHandlerUser.js
    - statsDBHandlerSystem.js
    - statsDBHandlerGovernance.js
2) function to launch queries including 'const q = fs.readFileSync(path.join(..)' and 'const result = await q='
*/



const parseAmount = (amount, coin) => {
    return parseFloat(div(
        amount,
        (coin === 'DAI' || coin === 'USD') ? BN(10).pow(18) : BN(10).pow(6),
        amountDecimal
    ));
}

// const getBlocks = async () => {
//     await getDefaultProvider().on("block", (blockNumber, b) => {
//         console.log('blockNumber: ', blockNumber, b);
//     })
// }

const getLastBlock = async (table) => {
    const q = fs.readFileSync(path.join(__dirname, `/../queries/select/select_last_blocknumber.sql`), 'utf8');
    const result = await query(q, 'select', [table]);
    console.log('last block:', result);
}

const getBlockData = async (blockNumber) => {
    const block = await getDefaultProvider()
        .getBlock(blockNumber)
        .catch((error) => {
            console.log(error);
        });
    return block;
}

const loadEthBlocks = async (blocks) => {
    try {
        console.log(`*** DB: Processing ${blocks.length} blocks...`);
        for (const item of blocks) {
            const block = await getBlockData(item.block_number);
            const q = fs.readFileSync(path.join(__dirname, `/../queries/insert/insert_eth_blocks.sql`), 'utf8');
            await query(q, 'insert', [
                block.number,
                block.timestamp,
                moment.unix(block.timestamp),
                42, //TODO: get it dynamically
                moment()]);
        }
        console.log(`*** DB: ${blocks.length} block/s added into ETH_BLOCKS`);
    } catch (err) {
        console.log(err);
    }
}

// const loadEthBlocks = async (fromBlock, toBlock) => {
//     for (let i = fromBlock; i < toBlock; i++) {
//         const block = await getBlockData(i);
//         const q = fs.readFileSync(path.join(__dirname, `/../queries/insert/insert_eth_blocks.sql`), 'utf8');
//         await query(q, 'insert', [
//             block.number,
//             block.timestamp,
//             moment.unix(block.timestamp),
//             42, //TODO: get it dynamically
//             moment()]);
//         console.log(`block ${block.number} added`);
//     }
// }

const updateLastBlockNumber = async (table, last_block) => {
    try {
        const q = fs.readFileSync(path.join(__dirname, `/../queries/update/update_sys_table_loads.sql`), 'utf8');
        await query(q, 'update', [
            table,
            last_block,
            42, //TODO: get it dynamically
            moment()]
        );
    } catch (err) {
        console.log(err);
    }
}


// TODO: replace hardcoded strings by CONSTANTS
// TODO: parse float function
// TODO: all interfaces in one file
// TODO: what if any fields from events are missing?
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
const ERC20_TRANSFER_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const Transfer = Object.freeze({ "DEPOSIT": 1, "WITHDRAWAL": 2 });

const getGTokenFromTx = async (result, transfer) => {
    try {
        console.log(`*** DB: Processing ${result.length} ${(transfer === Transfer.DEPOSIT) ? 'deposit' : 'withdrawal'} transactions...`);
        // Interface for ERC20 token transfer
        const iface = new ethers.utils.Interface([
            "event Transfer(address indexed from, address indexed to, uint256 amount)",
        ]);

        // For all transactions -> for all logs -> retrieve GToken
        for (const item of result) {
            const txReceipt = await getDefaultProvider()
                .getTransactionReceipt(item.tx_hash)
                .catch((err) => {
                    console.log(err);
                });
            for (const log of txReceipt.logs) {
                // Only when signature is an ERC20 transfer: `Transfer(address from, address to, uint256 value)`
                if (log.topics[0] === ERC20_TRANSFER_SIGNATURE) {
                    const index = (transfer === Transfer.DEPOSIT) ? 1 : 2; // from is 0x0 : to is 0x0
                    // Only when a token is minted (from: 0x)
                    if (log.topics[index] === ZERO_ADDRESS) {
                        const data = log.data;
                        const topics = log.topics;
                        const output = iface.parseLog({ data, topics });
                        // Update result array with the correct GTokens
                        if (item.gvt_amount !== 0) {
                            item.gvt_amount = parseFloat(ethers.utils.formatEther(output.args[2]));
                            item.gvt_amount = (transfer === Transfer.DEPOSIT) ? item.gvt_amount : -item.gvt_amount
                        } else {
                            item.pwrd_amount = parseFloat(ethers.utils.formatEther(output.args[2]));
                            item.pwrd_amount = (transfer === Transfer.DEPOSIT) ? item.pwrd_amount : -item.pwrd_amount
                        }
                    }
                }
            };
        };
        console.log(`*** DB: ${result.length} transactions processed.`);
        return result;
    } catch (err) {
        console.log(err);
    }
};
const parseDataFromEvent = async (logs, side) => {
    try {
        let result = [];
        logs.forEach((log) => {
            const dai_amount = (side === Transfer.DEPOSIT)
                ? parseAmount(log.args[4][0], 'DAI')
                : - parseAmount(log.args[8][0], 'DAI');
            const usdc_amount = (side === Transfer.DEPOSIT)
                ? parseAmount(log.args[4][1], 'USDC')
                : - parseAmount(log.args[8][1], 'USDC');
            const usdt_amount = (side === Transfer.DEPOSIT)
                ? parseAmount(log.args[4][2], 'USDT')
                : - parseAmount(log.args[8][2], 'USDT');
            const usd_deduct = (side === Transfer.DEPOSIT) ? 0 : - parseAmount(log.args[5], 'USD');
            const usd_return = (side === Transfer.DEPOSIT) ? 0 : - parseAmount(log.args[6], 'USD');
            const lp_amount = (side === Transfer.DEPOSIT) ? 0 : - parseAmount(log.args[7], 'USD');
            const usd_value = (side === Transfer.DEPOSIT)
                ? parseAmount(log.args[3], 'USD')
                : usd_return;
            result.push({
                block_number: log.blockNumber,
                tx_hash: log.transactionHash,
                network_id: 42, // TODO: retrieve from .env
                user_address: log.args[0],
                referral_address: log.args[1],
                usd_value: usd_value,
                gvt_value: (log.args[2]) ? 0 : usd_value,
                pwrd_value: (log.args[2]) ? usd_value : 0,
                usd_amount: dai_amount + usdc_amount + usdt_amount,
                gvt_amount: (log.args[2]) ? 0 : 1,  // calculated afterwards
                pwrd_amount: (log.args[2]) ? 1 : 0, // calculated afterwards
                dai_amount: dai_amount,
                usdc_amount: usdc_amount,
                usdt_amount: usdt_amount,
                creation_date: moment(),
                ...(side === Transfer.WITHDRAWAL) && { usd_deduct: usd_deduct },
                ...(side === Transfer.WITHDRAWAL) && { usd_return: usd_return },
                ...(side === Transfer.WITHDRAWAL) && { lp_amount: lp_amount },
            });
        });
        return result;
    } catch (err) {
        console.log(err);
    }
}

/// @notice Load deposits/withdrawals from all user accounts into temporary tables
///         Gtoken amount is retrieved from related transaction
///         Rest of data is retrieved from related event (LogNewDeposit or LogNewWithdrawal)
/// @param fromBlock Starting block to search for events
/// @param toBlock Ending block to search for events (normally latestBlock)
/// @param side Load deposits ('Transfer.Deposit') or withdrawals ('Transfer.Withdraw')
/// @param account User account to be processed - if null, all accounts to be processed

const loadTmpUserTransfers = async (
    fromBlock,
    toBlock,
    side,
    account = null
) => {
    try {
        // Get all deposit or withdrawal events for a given block range
        const logs = await getEvents(
            (side === Transfer.DEPOSIT)
                ? EVENT_TYPE.deposit
                : EVENT_TYPE.withdraw,
            fromBlock,
            toBlock,
            account,
        ).catch((error) => {
            console.log(error);
        });


        if (logs.length > 0) {
            // Parse relevant data from each event
            const preResult = await parseDataFromEvent(logs, side);

            // Get Gtoken amount from each transaction linked to the previous events 
            // and update gvt_amount & pwrd_amount
            const finalResult = await getGTokenFromTx(preResult, side);

            // Truncate table TMP_USER_DEPOSITS or TMP_USER_WITHDRAWALS
            let q = (side === Transfer.DEPOSIT)
                ? fs.readFileSync(path.join(__dirname, `/../queries/truncate/truncate_tmp_user_deposits.sql`), 'utf8')
                : fs.readFileSync(path.join(__dirname, `/../queries/truncate/truncate_tmp_user_withdrawals.sql`), 'utf8');
            await query(q, 'truncate', []);

            // Store data into table TMP_USER_DEPOSITS or TMP_USER_WITHDRAWALS
            q = (side === Transfer.DEPOSIT)
                ? fs.readFileSync(path.join(__dirname, `/../queries/insert/insert_tmp_user_deposits.sql`), 'utf8')
                : fs.readFileSync(path.join(__dirname, `/../queries/insert/insert_tmp_user_withdrawals.sql`), 'utf8');
            let params = [];
            for (const item of finalResult)
                params.push(Object.values(item));
            const rows = await batchQuery(q, 'insert', params);
            console.log(`*** DB: ${rows} records added into ${(side === Transfer.DEPOSIT) ? 'TMP_USER_DEPOSITS' : 'TMP_USER_WITHDRAWALS'}`);

            // Store latest block processed into table SYS_TABLE_LOADS
            await updateLastBlockNumber(
                (side === Transfer.DEPOSIT) ? 'TMP_USER_DEPOSITS' : 'TMP_USER_WITHDRAWALS',
                finalResult[finalResult.length - 1].block_number
            );

        } else {
            console.log(`*** DB: No moar ${(side === Transfer.DEPOSIT) ? 'deposits' : 'withdrawals'} to be processed.`);
        }
    } catch (err) {
        console.log(err);
    }
}

const loadUserTransfers = async () => {
    try {
        // Get block numbers to be processed from temporary tables on deposits & withdrawals
        let q = fs.readFileSync(path.join(__dirname, `/../queries/select/select_distinct_blocks_transfers.sql`), 'utf8');
        const blocks = await query(q, 'select', []);
        if (blocks.rows.length > 0) {

            // Add block numbers into ETH_BLOCKS (incl. block timestamp)
            await loadEthBlocks(blocks.rows);

            // Load deposits & withdrawals from temporary tables into USER_TRANSFERS
            q = fs.readFileSync(path.join(__dirname, `/../queries/insert/insert_user_transfers.sql`), 'utf8');
            const rows = await query(q, 'insert', []);
            console.log(`*** DB: ${rows.rowCount} records added into USER_TRANSFERS`);

            // Store latest block processed into table SYS_TABLE_LOADS
            q = fs.readFileSync(path.join(__dirname, `/../queries/select/select_max_block_transfers.sql`), 'utf8');
            const result = await query(q, 'select', []);
            if (result.rows) {
                await updateLastBlockNumber(
                    'USER_TRANSFERS',
                    result.rows[0].max_block_number
                );
            }
        } else {
            console.log('*** DB: No moar user transfers to be loaded (TMP_USER_DEPOSIT and TMP_USER_WITHDRAWALS empty?)');
        }
    } catch (err) {
        console.log(err);
    }
}

/// @notice Generates a collection of dates from a given start date to an end date
/// @param _fromDate Start date
/// @param _toDdate End date
/// @returns An array with all dates from the start to the end date
const generateDateRange = (_fromDate, _toDate) => {
    try {
        // Check format date
        if (_fromDate.length !== 10 || _toDate.length !== 10) {
            console.log('*** DB: Date format is incorrect: should be "DD/MM/YYYY');
            return;
        }

        // Build array of dates
        const fromDate = moment(_fromDate, "DD/MM/YYYY");
        const toDate = moment(_toDate, "DD/MM/YYYY");
        const days = toDate.diff(fromDate, 'days');
        let dates = [];
        let day;
        if (days >= 0) {
            for (let i = 0; i <= days; i++) {
                day = fromDate.clone().add(i, 'days');
                dates.push(day);
            }
        }
        return dates;
    } catch (err) {
        console.log(err);
    }
}

// TODO: account as perameter. If null, do all accounts from USER_TRANSFERS.
// TODO: fromDate as parameter. If null, do current date. Otherwise, fromDate until current D-1
const loadUserBalances = async (fromDate, toDate, account) => {
    try {

        const dates = generateDateRange(fromDate, toDate);
        console.log('dates:', dates);

        // Get all users with any transfer
        const q = fs.readFileSync(path.join(__dirname, `/../queries/select/select_distinct_users_transfers.sql`), 'utf8');
        const rows = await query(q, 'select', []);

        for (const date of dates) {

            // For each user, check gvt & pwrd balance and insert data into USER_BALANCES
            if (rows.rowCount > 0) {
                console.log(`*** DB: Processing ${rows.rowCount} user balances...`);

                const day = moment(date, "DD/MM/YYYY")
                    .add(23, 'hours')
                    .add(59, 'seconds')
                    .add(59, 'minutes')
                    .utc(true);

                const blockTag = {
                    blockTag: (await findBlockByDate(day)).block
                }

                let rowCount = 0;
                for (const item of rows.rows) {
                    const account = item.user_address;
                    const gvtValue = parseAmount(await getGvt().getAssets(account, blockTag), 'USD');
                    const pwrdValue = parseAmount(await getPwrd().getAssets(account, blockTag), 'USD');
                    const totalValue = gvtValue + pwrdValue;
                    const params = [
                        day,
                        42,
                        account,
                        totalValue,
                        gvtValue,
                        pwrdValue,
                        moment()
                    ];
                    const q = fs.readFileSync(path.join(__dirname, `/../queries/insert/insert_user_balances.sql`), 'utf8');
                    rowCount += (await query(q, 'insert', params)).rowCount;
                }
                console.log(`*** DB: ${rowCount} record/s added into USER_BALANCES for date ${day}`);
            } else {
                console.log('*** DB: No users with transfers found - No balance calculation needed.')
            }
        }
    } catch (err) {
        console.log(err);
    }
}

// TODO: to be moved to /common. 
// Files currently using findBlockByDate: statsDBHandler.js, apyHandler.js and currentApyHandler.js
let scanner;
function updateBlocksScanner(newProvider) {
    scanner = new BlocksScanner(newProvider);
}
async function findBlockByDate(scanDate) {
    console.log('date:', scanDate);
    try {
        const blockFound = await scanner
            .getDate(scanDate.toDate())
            .catch((error) => {
                logger.error(error);
                logger.error(`Could not get block ${scanDate}`);
            });
        //logger.info(`scanDate ${scanDate} block ${blockFound.block}`);
        console.log(`scanDate ${scanDate} block ${blockFound.block}`);
        return blockFound;
    } catch (err) {
        console.log(err);
    }
}


const reload = async (from) => {

}



const loadGroStatsDB = async () => {
    try {
        //const fromBlock = getConfig('blockchain.start_block');
        // case 1: all addresses starting at a certain block
        // const fromBlock = 25277000;
        // const toBlock = (await getDefaultProvider().getBlock()).number;
        // case 2: one address starting from contract deployment block
        // const fromBlock = getConfig('blockchain.start_block');
        // const toBlock = (await getDefaultProvider().getBlock()).number;
        const fromBlock = 25256704;  // sjs ini
        const toBlock = 252770003;  // sjs end

        initAllContracts().then(async () => {
            // // TODO: ******* PROVAR una adreça que no existeixi
            // // Case 1: All accounts
            // await loadTmpUserTransfers(fromBlock, toBlock, Transfer.DEPOSIT, null);
            // await loadTmpUserTransfers(fromBlock, toBlock, Transfer.WITHDRAWAL, null);
            // // Case 2: One account
            // // TODO: *** if temporary deposits or withdrawals failed, do not execute loadUserTransfers()
            // await loadTmpUserTransfers(fromBlock, toBlock, Transfer.DEPOSIT, '0xb5bE4d2510294d0BA77214F26F704d2956a99072');
            // await loadTmpUserTransfers(fromBlock, toBlock, Transfer.WITHDRAWAL, '0xb5bE4d2510294d0BA77214F26F704d2956a99072');
            // await loadUserTransfers();
            // await loadUserBalances(null, null);

            const provider = getAlchemyRpcProvider('stats_gro');
            scanner = new BlocksScanner(provider);
            // const block1 = await findBlockByDate(moment());
            // const block2 = await findBlockByDate(moment("04/06/2021 10:09:00", "DD/MM/YYYY HH:mm:ss"));
            // console.log('block: ', block1, block2);
            //await dailyLoad("07/06/2021", null);
            await loadUserBalances("04/06/2021", "05/06/2021", null);
            //await loadUserBalances(null, null);

            process.exit();
        });

        // const a = generateDateRange("01/06/2021", "15/06/2021");
        // console.log(a);



    } catch (err) {
        console.log(err);
    }
}

// TODO: subscribe to DepositHandler and WithdrawHandler from the latest block processed. From there,
// keep updating any new deposit or withdraw at address level.


module.exports = {
    //generateGroStatsFile,
    loadGroStatsDB,
};
