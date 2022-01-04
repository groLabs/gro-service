import moment from 'moment';
import BN from 'bignumber.js';
import { div } from '../../common/digitalUtil';
import {
    getStables,
    getGroVault,
    getPowerD,
    getBuoy,
} from '../common/contractUtil';
import {
    getNetwork,
    parseAmount
} from '../common/globalUtil';
import { getStableCoinIndex } from '../common/personalUtil';
import {
    Base,
    GlobalNetwork
} from '../types';
import {
    showInfo,
    showError,
    showWarning,
} from '../handler/logHandler';

// const botEnv = process.env.BOT_ENV.toLowerCase();
// const logger = require(`../../${botEnv}/${botEnv}Logger`);

const getApprovalValue = async (tokenAddress, amount, tokenSymbol) => {
    try {
        let usdAmount = 0;
        if (getGroVault().address === tokenAddress) {
            usdAmount = await getGroVault()
                .getShareAssets(amount)
                .catch((err) => {
                    showError('personalStatsApprovalsParser.ts->getApprovalValue(): getGroVault:', err);
                });
        } else if (getPowerD().address === tokenAddress) {
            usdAmount = await getPowerD().getShareAssets(amount)
                .catch((err) => {
                    showError('personalStatsApprovalsParser.ts->getApprovalValue(): getPowerD', err);
                });
        } else {
            usdAmount = await getBuoy().singleStableToUsd(
                amount,
                getStableCoinIndex(tokenSymbol)
            );
        }
        return parseAmount(usdAmount, Base.D18);
    } catch (err) {
        showError(
            'personalStatsApprovalsParser.ts->getApprovalValue()',
            `[tokenAddress: ${tokenAddress}, amount: ${amount}, tokenSymbol: ${tokenSymbol}]: ${err}`,
        );
        return 0;
    }
};

//TODO: can't return false or approvals (not TS rulez)
const parseApprovalEvents = async (
    globalNetwork: GlobalNetwork,
    logs
) => {
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
                    network_id: getNetwork(globalNetwork).id,
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
                showError(
                    'personalStatsApprovalsParser.ts->parseApprovalEvents()',
                    'Wrong decimal in coin amount'
                );
                return false;
            }
        }
        return approvals;
    } catch (err) {
        showError('personalStatsApprovalsParser.ts->parseApprovalEvents()', err);
        return false;
    }
};

export {
    parseApprovalEvents,
};