const BN = require('bignumber.js');
const moment = require('moment');
const { getConfig } = require('../../common/configUtil');
const { div } = require('../../common/digitalUtil');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;
const ratioDecimal = getConfig('blockchain.ratio_decimal_place', false) || 4;
// const {
//     getGvt,
//     getPwrd,
//     getBuoy,
//     getVaultStableCoins,
// } = require('../../contract/allContracts');
const providerKey = 'stats_personal';
const { ContractNames } = require('../../registry/registry');
const { getLatestSystemContract } = require('../../stats/common/contractStorage');
const {
    getNetworkId,
    getStableCoinIndex,
    handleErr,
    isDeposit,
    Transfer,
    transferType,
} = require('../common/personalUtil');


function getLatestGroVault() {
    return getLatestSystemContract(ContractNames.groVault, providerKey)
        .contract;
}

function getLatestPowerD() {
    return getLatestSystemContract(ContractNames.powerD, providerKey)
        .contract;
}

function getLatestBuoy() {
    return getLatestSystemContract(ContractNames.Buoy3Pool, providerKey)
        .contract;
}

// async function getStableCoins() {
//     if (!stableCoins.length) {
//         const latestController = getLatestSystemContract(
//             ContractNames.controller,
//             providerKey
//         ).contract;
//         const stableCoinAddresses = await latestController
//             .stablecoins()
//             .catch((error) => {
//                 logger.error(error);
//                 return [];
//             });
//         for (let i = 0; i < stableCoinAddresses.length; i += 1) {
//             stableCoins.push(
//                 new ethers.Contract(stableCoinAddresses[i], erc20ABI, provider)
//             );
//         }
//     }
//     return stableCoins;
// }

// async function getStableCoinsInfo() {
//     const keys = Object.keys(stableCoinsInfo);
//     if (!keys.length) {
//         stableCoinsInfo.decimals = {};
//         stableCoinsInfo.symbols = {};
//         const coins = await getStableCoins();
//         const decimalPromise = [];
//         const symbolPromise = [];
//         for (let i = 0; i < coins.length; i += 1) {
//             decimalPromise.push(coins[i].decimals());
//             symbolPromise.push(coins[i].symbol());
//         }
//         const decimals = await Promise.all(decimalPromise);
//         const symbols = await Promise.all(symbolPromise);

//         for (let i = 0; i < coins.length; i += 1) {
//             stableCoinsInfo.decimals[coins[i].address] = decimals[i].toString();
//             stableCoinsInfo.symbols[coins[i].address] = symbols[i];
//         }
//     }
//     return stableCoinsInfo;
// }





const parseAmount = (amount, coin) => {
//console.log(amount, coin)
    // try {
    return parseFloat(
        div(
            amount,
            coin === 'DAI' || coin === 'USD' ? BN(10).pow(18) : BN(10).pow(6),
            amountDecimal
        )
    );
    // } catch (err) {
    //     console.log(err);
    // }
};

const getApprovalValue = async (tokenAddress, amount, tokenSymbol) => {
    try {
console.log('shit')
        let usdAmount = 0;
        // if (getGvt().address === tokenAddress) {
        if (getLatestGroVault().address === tokenAddress) {
            // usdAmount = await getGvt()
            usdAmount = await getLatestGroVault()
                .getShareAssets(amount)
                .catch((error) => {
                    logger.error(error);
                });
        // } else if (getPwrd().address === tokenAddress) {
        } else if (getLatestPowerD().address === tokenAddress) {
            // usdAmount = await getPwrd.getShareAssets(amount).catch((error) => {
            usdAmount = await getLatestPowerD().getShareAssets(amount).catch((error) => {
                logger.error(error);
            });
        } else {
            // usdAmount = await getBuoy().singleStableToUsd(
            usdAmount = await getLatestBuoy().singleStableToUsd(
                amount,
                getStableCoinIndex(tokenSymbol)
            );
        }
        return parseAmount(usdAmount, 'USD');
    } catch (err) {
        handleErr(
            `personalStatsParser->getApprovalValue() [tokenAddress: ${tokenAddress}, amount: ${amount}, tokenSymbol: ${tokenSymbol}]`,
            err
        );
        return 0;
    }
};

const parseApprovalEvents = async (logs) => {
    try {
console.log('shit')
        const stableCoinInfo = getVaultStableCoins();
        const approvals = [];
        for (const log of logs) {
            const decimal = stableCoinInfo.decimals[log.address];
            // Decimals should be 6 for USDC & USDT or 18 for DAI, GVT & PWRD.
            if (decimal >= 6) {
                // To be included in a parseApprovalEvent() function
                const tokenSymbol = stableCoinInfo.symbols[log.address];
                approvals.push({
                    block_number: log.blockNumber,
                    network_id: getNetworkId(),
                    stablecoin_id: getStableCoinIndex(tokenSymbol),
                    tx_hash: log.transactionHash,
                    sender_address: log.args[0],
                    spender_address: log.args[1],
                    coin_amount: div(log.args[2], BN(10).pow(decimal), 2),
                    coin_usd: await getApprovalValue(
                        log.address,
                        log.args[2],
                        tokenSymbol
                    ),
                    creation_date: moment.utc(),
                });
                // }
            } else {
                handleErr(
                    `personalStatsParser->parseApprovalEvents(): Wrong decimal in coin amount`,
                    null
                );
                return false;
            }
        }
        return approvals;
    } catch (err) {
        handleErr(`personalStatsParser->parseApprovalEvents()`, err);
        return false;
    }
};

const parseTransferEvents = async (logs, side) => {
    try {
        let result = [];
        logs.forEach((log) => {
//  if (side === 1) {
//     console.log(`side: ${side} log: ${log} logs0: ${log[0]} logs: ${log.args}`)
//  }
            const dai_amount =
                side === Transfer.DEPOSIT
                    ? parseAmount(log.args[4][0], 'DAI') // LogNewDeposit.tokens[0]
                    : side === Transfer.WITHDRAWAL
                    ? -parseAmount(log.args[8][0], 'DAI') // LogNewWithdrawal.tokenAmounts[0]
                    : 0;
            const usdc_amount =
                side === Transfer.DEPOSIT
                    ? parseAmount(log.args[4][1], 'USDC') // LogNewDeposit.tokens[1]
                    : side === Transfer.WITHDRAWAL
                    ? -parseAmount(log.args[8][1], 'USDC') // LogNewWithdrawal.tokenAmounts[1]
                    : 0;
            const usdt_amount =
                side === Transfer.DEPOSIT
                    ? parseAmount(log.args[4][2], 'USDT') // LogNewDeposit.tokens[2]
                    : side === Transfer.WITHDRAWAL
                    ? -parseAmount(log.args[8][2], 'USDT') // LogNewWithdrawal.tokenAmounts[2]
                    : 0;
            const usd_deduct =
                side === Transfer.WITHDRAWAL
                    ? -parseAmount(log.args[5], 'USD') // LogNewWithdrawal.deductUsd
                    : 0;
            const lp_amount =
                side === Transfer.WITHDRAWAL
                    ? -parseAmount(log.args[7], 'USD') // LogNewWithdrawal.lpAmount
                    : 0;
            const usd_return =
                side === Transfer.WITHDRAWAL
                    ? -parseAmount(log.args[6], 'USD') // LogNewWithdrawal.returnUsd
                    : side === Transfer.EXTERNAL_GVT_WITHDRAWAL
                    ? -(
                          parseAmount(log.args[2], 'USD') /
                          parseAmount(log.args[3], 'USD')
                      ) // LogTransfer.amount /  LogTransfer.ratio (GVT)
                    : side === Transfer.EXTERNAL_PWRD_WITHDRAWAL
                    ? -parseAmount(log.args[2], 'USD') // LogTransfer.amount (PWRD)
                    : 0;
            const usd_value =
                side === Transfer.DEPOSIT
                    ? parseAmount(log.args[3], 'USD') // LogNewDeposit.usdAmount  ** TODO: retrieve the ratio!!!! **
                    : side === Transfer.WITHDRAWAL ||
                      side === Transfer.EXTERNAL_GVT_WITHDRAWAL ||
                      side === Transfer.EXTERNAL_PWRD_WITHDRAWAL
                    ? usd_return
                    : side === Transfer.EXTERNAL_GVT_DEPOSIT
                    ? parseAmount(log.args[2], 'USD') /
                      parseAmount(log.args[3], 'USD') // LogTransfer.amount /  LogTransfer.ratio (GVT)
                    : side === Transfer.EXTERNAL_PWRD_DEPOSIT
                    ? parseAmount(log.args[2], 'USD') // // LogTransfer.amount (PWRD) ** TODO: retrieve the ratio!!!! **
                    : 0;
            const stable_amount =
                side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL
                    ? dai_amount + usdc_amount + usdt_amount
                    : 0;
            const isGVT =
                ((side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL) &&
                    !log.args[2]) ||
                side === Transfer.EXTERNAL_GVT_DEPOSIT ||
                side === Transfer.EXTERNAL_GVT_WITHDRAWAL
                    ? true
                    : false;
            const gvt_amount =
                (side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL) &&
                isGVT
                    ? 1 // calculated afterwards for Transfer.DEPOSIT & Transfer.WITHDRAWAL
                    : side === Transfer.EXTERNAL_GVT_DEPOSIT
                    ? parseAmount(log.args[2], 'USD') // LogTransfer.amount (GVT)
                    : side === Transfer.EXTERNAL_GVT_WITHDRAWAL
                    ? -parseAmount(log.args[2], 'USD') // LogTransfer.amount (GVT)
                    : 0;
            const pwrd_amount =
                (side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL) &&
                !isGVT
                    ? 1 // calculated afterwards for Transfer.DEPOSIT & Transfer.WITHDRAWAL
                    : side === Transfer.EXTERNAL_PWRD_DEPOSIT
                    ? parseAmount(log.args[2], 'USD') // LogTransfer.amount (PWRD)
                    : side === Transfer.EXTERNAL_PWRD_WITHDRAWAL
                    ? -parseAmount(log.args[2], 'USD') // LogTransfer.amount (PWRD)
                    : 0;
            const userAddress =
                side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL
                    ? log.args[0] // LogNewDeposit.user or LogNewWithdrawal.user
                    : side === Transfer.EXTERNAL_GVT_WITHDRAWAL ||
                      side === Transfer.EXTERNAL_PWRD_WITHDRAWAL
                    ? log.args[0] // LogTransfer.sender
                    : log.args[1]; // LogTransfer.receiver
            const referralAddress =
                side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL
                    ? log.args[1]
                    : '0x0000000000000000000000000000000000000000';
            result.push({
                block_number: log.blockNumber,
                tx_hash: log.transactionHash,
                network_id: getNetworkId(),
                transfer_type: transferType(side),
                user_address: userAddress,
                referral_address: referralAddress,
                usd_value: usd_value,
                gvt_value: isGVT ? usd_value : 0,
                pwrd_value: isGVT ? 0 : usd_value,
                gvt_amount: gvt_amount,
                pwrd_amount: pwrd_amount,
                stable_amount: stable_amount,
                dai_amount: dai_amount,
                usdc_amount: usdc_amount,
                usdt_amount: usdt_amount,
                creation_date: moment.utc(),
                ...(!isDeposit(side) && { usd_deduct: usd_deduct }),
                ...(!isDeposit(side) && { usd_return: usd_return }),
                ...(!isDeposit(side) && { lp_amount: lp_amount }),
            });
        });
        return result;
    } catch (err) {
        handleErr(
            `personalStatsParser->parseTransferEvents() [side: ${side}]`,
            err
        );
    }
};

module.exports = {
    parseAmount,
    parseApprovalEvents,
    parseTransferEvents,
};
