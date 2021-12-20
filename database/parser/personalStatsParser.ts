//@ts-nocheck

import BN from 'bignumber.js';
import moment from 'moment';
import { getConfig } from '../../common/configUtil';
import { div } from '../../common/digitalUtil';
import { getNetworkId2 } from '../common/globalUtil';
import {
    getNetworkId,
    getStableCoinIndex,
    handleErr,
    isInflow,
    isOutflow,
    isDepositOrWithdrawal,
    transferType,
} from '../common/personalUtil';
import {
    getGroVault,
    getPowerD,
    getBuoy,
    getStables
} from '../common/contractUtil';
import {
    GlobalNetwork,
    Transfer
} from '../types';

const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);


const parseAmount = (amount, coin) => {
    return parseFloat(
        div(
            amount,
            coin === 'DAI' || coin === 'USD' ? new BN(10).pow(18) : new BN(10).pow(6),
            amountDecimal
        )
    );
};

const getApprovalValue = async (tokenAddress, amount, tokenSymbol) => {
    try {
        let usdAmount = 0;
        if (getGroVault().address === tokenAddress) {
            usdAmount = await getGroVault()
                .getShareAssets(amount)
                .catch((error) => {
                    logger.error(error);
                });
        } else if (getPowerD().address === tokenAddress) {
            usdAmount = await getPowerD().getShareAssets(amount).catch((error) => {
                logger.error(error);
            });
        } else {
            usdAmount = await getBuoy().singleStableToUsd(
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

const parseTransferEvents = async (
    network: GlobalNetwork,
    logs,
    side
) => {
    try {
        let result = [];
        logs.forEach((log) => {
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
                    : side === Transfer.TRANSFER_PWRD_OUT
                        ? -parseAmount(log.args[2], 'USD') // Transfer.value
                        : 0;

            // gvt value is calculated afterwards
            const usd_value =
                side === Transfer.DEPOSIT
                    ? parseAmount(log.args[3], 'USD') // LogNewDeposit.usdAmount
                    : (side === Transfer.WITHDRAWAL ||
                        side === Transfer.TRANSFER_PWRD_OUT)
                        ? usd_return
                        : side === Transfer.TRANSFER_PWRD_IN
                            ? parseAmount(log.args[2], 'USD') // // Transfer.value
                            : 0;

            const stable_amount =
                side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL
                    ? dai_amount + usdc_amount + usdt_amount
                    : 0;

            const isGVT =
                ((side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL) && !log.args[2])
                    || side === Transfer.TRANSFER_GVT_IN
                    || side === Transfer.TRANSFER_GVT_OUT
                    ? true
                    : false;

            const gvt_amount =
                (side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL) && isGVT
                    ? 1 // calculated afterwards for Transfer.DEPOSIT & Transfer.WITHDRAWAL in tx
                    : side === Transfer.TRANSFER_GVT_IN
                        ? parseAmount(log.args[2], 'USD') // Transfer.value
                        : side === Transfer.TRANSFER_GVT_OUT
                            ? -parseAmount(log.args[2], 'USD') // Transfer.value
                            : 0;

            const pwrd_amount =
                (side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL) && !isGVT
                    ? 1 // calculated afterwards for Transfer.DEPOSIT & Transfer.WITHDRAWAL in tx
                    : side === Transfer.TRANSFER_PWRD_IN
                        ? parseAmount(log.args[2], 'USD') // Transfer.value
                        : side === Transfer.TRANSFER_PWRD_OUT
                            ? -parseAmount(log.args[2], 'USD') // Transfer.value
                            : 0;

            const userAddress = isDepositOrWithdrawal(side)
                ? log.args[0] // LogNewDeposit.user, LogNewWithdrawal.user, LogDeposit.from, LogWithdrawal.from
                : isOutflow(side)
                    ? log.args[0] // Transfer.from
                    : log.args[1]; // Transfer.to

            const referralAddress =
                side === Transfer.DEPOSIT || side === Transfer.WITHDRAWAL
                    ? log.args[1]
                    : '0x0000000000000000000000000000000000000000';

            //TODO: falta minting i burning
            //TODO: shouldn't the price be calculated also at the transaction time (like gvt or pwrd?)
            const gro_amount =
                side === Transfer.TRANSFER_GRO_IN
                    ? parseAmount(log.args[2], 'USD') // Transfer.value
                    : side === Transfer.TRANSFER_GRO_OUT
                        ? -parseAmount(log.args[2], 'USD') // Transfer.value
                        : 0;

            const usdc_e_amount =
                side === Transfer.DEPOSIT_USDCe
                    || side === Transfer.TRANSFER_USDCe_IN
                    ? parseAmount(log.args[2], 'USDC') // LogDeposit.shares, Transfer.value
                    : side === Transfer.WITHDRAWAL_USDCe
                        || side === Transfer.TRANSFER_USDCe_OUT
                        ? -parseAmount(log.args[2], 'USDC') // LogWithdrawal.shares, Transfer.value
                        : 0;

            const usdt_e_amount =
                side === Transfer.DEPOSIT_USDTe
                    || side === Transfer.TRANSFER_USDTe_IN
                    ? parseAmount(log.args[2], 'USDT') // LogDeposit.shares, Transfer.value
                    : side === Transfer.WITHDRAWAL_USDTe
                        || side === Transfer.TRANSFER_USDTe_OUT
                        ? -parseAmount(log.args[2], 'USDT') // LogWithdrawal.shares, Transfer.value
                        : 0;

            const dai_e_amount =
                side === Transfer.DEPOSIT_DAIe
                    || side === Transfer.TRANSFER_DAIe_IN
                    ? parseAmount(log.args[2], 'DAI') // LogDeposit.shares, Transfer.value
                    : side === Transfer.WITHDRAWAL_DAIe
                        || side === Transfer.TRANSFER_DAIe_OUT
                        ? -parseAmount(log.args[2], 'DAI') // LogWithdrawal.shares, Transfer.value
                        : 0;

            result.push({
                block_number: log.blockNumber,
                tx_hash: log.transactionHash,
                network_id: getNetworkId2(network),
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
                gro_amount: gro_amount,
                creation_date: moment.utc(),
                ...(!isInflow(side) && { usd_deduct: usd_deduct }),
                ...(!isInflow(side) && { usd_return: usd_return }),
                ...(!isInflow(side) && { lp_amount: lp_amount }),
                usdc_e_amount: usdc_e_amount,
                usdt_e_amount: usdt_e_amount,
                dai_e_amount: dai_e_amount,
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

const parseApprovalEvents = async (logs) => {
    try {
        const stableCoinInfo = await getStables();
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
                    coin_amount: div(log.args[2], new BN(10).pow(decimal), 2),
                    coin_usd: await getApprovalValue(
                        log.address,
                        log.args[2],
                        tokenSymbol
                    ),
                    creation_date: moment.utc(),
                });
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

export {
    parseAmount,
    parseApprovalEvents,
    parseTransferEvents,
};
