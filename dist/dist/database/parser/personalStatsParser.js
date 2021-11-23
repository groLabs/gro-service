"use strict";
//@ts-nocheck
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTransferEvents = exports.parseApprovalEvents = exports.parseAmount = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const moment_1 = __importDefault(require("moment"));
const configUtil_1 = require("../../common/configUtil");
const digitalUtil_1 = require("../../common/digitalUtil");
const personalUtil_1 = require("../common/personalUtil");
const contractUtil_1 = require("../common/contractUtil");
const amountDecimal = (0, configUtil_1.getConfig)('blockchain.amount_decimal_place', false) || 7;
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const parseAmount = (amount, coin) => {
    return parseFloat((0, digitalUtil_1.div)(amount, coin === 'DAI' || coin === 'USD' ? new bignumber_js_1.default(10).pow(18) : new bignumber_js_1.default(10).pow(6), amountDecimal));
};
exports.parseAmount = parseAmount;
const getApprovalValue = async (tokenAddress, amount, tokenSymbol) => {
    try {
        let usdAmount = 0;
        if ((0, contractUtil_1.getGroVault)().address === tokenAddress) {
            usdAmount = await (0, contractUtil_1.getGroVault)()
                .getShareAssets(amount)
                .catch((error) => {
                logger.error(error);
            });
        }
        else if ((0, contractUtil_1.getPowerD)().address === tokenAddress) {
            usdAmount = await (0, contractUtil_1.getPowerD)().getShareAssets(amount).catch((error) => {
                logger.error(error);
            });
        }
        else {
            usdAmount = await (0, contractUtil_1.getBuoy)().singleStableToUsd(amount, (0, personalUtil_1.getStableCoinIndex)(tokenSymbol));
        }
        return parseAmount(usdAmount, 'USD');
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`personalStatsParser->getApprovalValue() [tokenAddress: ${tokenAddress}, amount: ${amount}, tokenSymbol: ${tokenSymbol}]`, err);
        return 0;
    }
};
const parseApprovalEvents = async (logs) => {
    try {
        const stableCoinInfo = await (0, contractUtil_1.getStables)();
        const approvals = [];
        for (const log of logs) {
            const decimal = stableCoinInfo.decimals[log.address];
            // Decimals should be 6 for USDC & USDT or 18 for DAI, GVT & PWRD.
            if (decimal >= 6) {
                // To be included in a parseApprovalEvent() function
                const tokenSymbol = stableCoinInfo.symbols[log.address];
                approvals.push({
                    block_number: log.blockNumber,
                    network_id: (0, personalUtil_1.getNetworkId)(),
                    stablecoin_id: (0, personalUtil_1.getStableCoinIndex)(tokenSymbol),
                    tx_hash: log.transactionHash,
                    sender_address: log.args[0],
                    spender_address: log.args[1],
                    coin_amount: (0, digitalUtil_1.div)(log.args[2], new bignumber_js_1.default(10).pow(decimal), 2),
                    coin_usd: await getApprovalValue(log.address, log.args[2], tokenSymbol),
                    creation_date: moment_1.default.utc(),
                });
                // }
            }
            else {
                (0, personalUtil_1.handleErr)(`personalStatsParser->parseApprovalEvents(): Wrong decimal in coin amount`, null);
                return false;
            }
        }
        return approvals;
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`personalStatsParser->parseApprovalEvents()`, err);
        return false;
    }
};
exports.parseApprovalEvents = parseApprovalEvents;
const parseTransferEvents = async (logs, side) => {
    try {
        let result = [];
        logs.forEach((log) => {
            const dai_amount = side === personalUtil_1.Transfer.DEPOSIT
                ? parseAmount(log.args[4][0], 'DAI') // LogNewDeposit.tokens[0]
                : side === personalUtil_1.Transfer.WITHDRAWAL
                    ? -parseAmount(log.args[8][0], 'DAI') // LogNewWithdrawal.tokenAmounts[0]
                    : 0;
            const usdc_amount = side === personalUtil_1.Transfer.DEPOSIT
                ? parseAmount(log.args[4][1], 'USDC') // LogNewDeposit.tokens[1]
                : side === personalUtil_1.Transfer.WITHDRAWAL
                    ? -parseAmount(log.args[8][1], 'USDC') // LogNewWithdrawal.tokenAmounts[1]
                    : 0;
            const usdt_amount = side === personalUtil_1.Transfer.DEPOSIT
                ? parseAmount(log.args[4][2], 'USDT') // LogNewDeposit.tokens[2]
                : side === personalUtil_1.Transfer.WITHDRAWAL
                    ? -parseAmount(log.args[8][2], 'USDT') // LogNewWithdrawal.tokenAmounts[2]
                    : 0;
            const usd_deduct = side === personalUtil_1.Transfer.WITHDRAWAL
                ? -parseAmount(log.args[5], 'USD') // LogNewWithdrawal.deductUsd
                : 0;
            const lp_amount = side === personalUtil_1.Transfer.WITHDRAWAL
                ? -parseAmount(log.args[7], 'USD') // LogNewWithdrawal.lpAmount
                : 0;
            const usd_return = side === personalUtil_1.Transfer.WITHDRAWAL
                ? -parseAmount(log.args[6], 'USD') // LogNewWithdrawal.returnUsd
                : side === personalUtil_1.Transfer.TRANSFER_PWRD_OUT
                    ? -parseAmount(log.args[2], 'USD') // Transfer.value
                    : 0;
            // gvt value is calculated afterwards
            const usd_value = side === personalUtil_1.Transfer.DEPOSIT
                ? parseAmount(log.args[3], 'USD') // LogNewDeposit.usdAmount
                : (side === personalUtil_1.Transfer.WITHDRAWAL ||
                    side === personalUtil_1.Transfer.TRANSFER_PWRD_OUT)
                    ? usd_return
                    : side === personalUtil_1.Transfer.TRANSFER_PWRD_IN
                        ? parseAmount(log.args[2], 'USD') // // Transfer.value
                        : 0;
            const stable_amount = side === personalUtil_1.Transfer.DEPOSIT || side === personalUtil_1.Transfer.WITHDRAWAL
                ? dai_amount + usdc_amount + usdt_amount
                : 0;
            const isGVT = ((side === personalUtil_1.Transfer.DEPOSIT || side === personalUtil_1.Transfer.WITHDRAWAL) && !log.args[2]) ||
                side === personalUtil_1.Transfer.TRANSFER_GVT_IN ||
                side === personalUtil_1.Transfer.TRANSFER_GVT_OUT ||
                side === personalUtil_1.Transfer.EXTERNAL_GVT_CONTRACT_DEPOSIT ||
                side === personalUtil_1.Transfer.EXTERNAL_GVT_CONTRACT_WITHDRAWAL
                ? true
                : false;
            const gvt_amount = (side === personalUtil_1.Transfer.DEPOSIT || side === personalUtil_1.Transfer.WITHDRAWAL) && isGVT
                ? 1 // calculated afterwards for Transfer.DEPOSIT & Transfer.WITHDRAWAL in tx
                : (side === personalUtil_1.Transfer.TRANSFER_GVT_IN ||
                    side === personalUtil_1.Transfer.EXTERNAL_GVT_CONTRACT_DEPOSIT)
                    ? parseAmount(log.args[2], 'USD') // Transfer.value
                    : (side === personalUtil_1.Transfer.TRANSFER_GVT_OUT ||
                        side === personalUtil_1.Transfer.EXTERNAL_GVT_CONTRACT_WITHDRAWAL)
                        ? -parseAmount(log.args[2], 'USD') // Transfer.value
                        : 0;
            const pwrd_amount = (side === personalUtil_1.Transfer.DEPOSIT || side === personalUtil_1.Transfer.WITHDRAWAL) && !isGVT
                ? 1 // calculated afterwards for Transfer.DEPOSIT & Transfer.WITHDRAWAL in tx
                : side === personalUtil_1.Transfer.TRANSFER_PWRD_IN
                    ? parseAmount(log.args[2], 'USD') // Transfer.value
                    : (side === personalUtil_1.Transfer.TRANSFER_PWRD_OUT ||
                        side === personalUtil_1.Transfer.EXTERNAL_PWRD_CONTRACT_WITHDRAWAL)
                        ? -parseAmount(log.args[2], 'USD') // Transfer.value
                        : 0;
            const userAddress = side === personalUtil_1.Transfer.DEPOSIT || side === personalUtil_1.Transfer.WITHDRAWAL
                ? log.args[0] // LogNewDeposit.user or LogNewWithdrawal.user
                : (side === personalUtil_1.Transfer.TRANSFER_GVT_OUT ||
                    side === personalUtil_1.Transfer.TRANSFER_PWRD_OUT ||
                    side === personalUtil_1.Transfer.EXTERNAL_GVT_CONTRACT_WITHDRAWAL ||
                    side === personalUtil_1.Transfer.EXTERNAL_PWRD_CONTRACT_WITHDRAWAL)
                    ? log.args[0] // LogTransfer.sender
                    : log.args[1]; // LogTransfer.receiver
            const referralAddress = side === personalUtil_1.Transfer.DEPOSIT || side === personalUtil_1.Transfer.WITHDRAWAL
                ? log.args[1]
                : '0x0000000000000000000000000000000000000000';
            result.push(Object.assign(Object.assign(Object.assign({ block_number: log.blockNumber, tx_hash: log.transactionHash, network_id: (0, personalUtil_1.getNetworkId)(), transfer_type: (0, personalUtil_1.transferType)(side), user_address: userAddress, referral_address: referralAddress, usd_value: usd_value, gvt_value: isGVT ? usd_value : 0, pwrd_value: isGVT ? 0 : usd_value, gvt_amount: gvt_amount, pwrd_amount: pwrd_amount, stable_amount: stable_amount, dai_amount: dai_amount, usdc_amount: usdc_amount, usdt_amount: usdt_amount, creation_date: moment_1.default.utc() }, (!(0, personalUtil_1.isDeposit)(side) && { usd_deduct: usd_deduct })), (!(0, personalUtil_1.isDeposit)(side) && { usd_return: usd_return })), (!(0, personalUtil_1.isDeposit)(side) && { lp_amount: lp_amount })));
        });
        return result;
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`personalStatsParser->parseTransferEvents() [side: ${side}]`, err);
    }
};
exports.parseTransferEvents = parseTransferEvents;
