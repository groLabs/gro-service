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
    errorObj,
    getNetwork,
    parseAmount
} from '../common/globalUtil';
import { getStableCoinIndex } from '../common/personalUtil';
import {
    Base,
    TokenId,
    Transfer,
    GlobalNetwork,
    ContractVersion,
} from '../types';
import {
    showInfo,
    showError,
    showWarning,
} from '../handler/logHandler';
import {
    MAX_NUMBER,
    QUERY_ERROR,
    QUERY_SUCCESS
} from '../constants';
import { ICall } from '../interfaces/ICall';


const getGvtValue = async (amount) => {
    if (parseAmount(amount, Base.D18) > MAX_NUMBER) {
        return -1;
    } else {
        const usdAmount = await getGroVault()
            .getShareAssets(amount)
            .catch((err) => {
                showError('personalStatsApprovalsParser.ts->getGvtValue():', err);
                return 0;
            });
        return parseAmount(usdAmount, Base.D18);
    }
}

const personalStatsApprovalsParser = async (
    contractVersion: ContractVersion,
    globalNetwork: GlobalNetwork,
    tokenId: TokenId,
    logs: any,
    side: Transfer,
    account: string,
): Promise<ICall> => {
    try {

        const approvals = [];
        for (const log of logs) {

            let coinAmount = ([
                TokenId.DAI,
                TokenId.GRO,
                TokenId.GVT,
                TokenId.groDAI_e]
                .includes(tokenId))
                ? parseAmount(log.args[2], Base.D18)
                : parseAmount(log.args[2], Base.D6);

            // If amount is above DB's NUMERIC(20,8) type, set to -1 (to save DB space),
            // and convert to MAX_NUMBER within the personalStats handler
            coinAmount = coinAmount < MAX_NUMBER
                ? coinAmount
                : -1;

            // Exclude approval events with 0 amount
            if (coinAmount !== 0)
                approvals.push({
                    block_number: log.blockNumber,
                    tx_hash: log.transactionHash,
                    network_id: getNetwork(globalNetwork).id,
                    token_id: tokenId,
                    version_id: contractVersion,
                    sender_address: log.args[0],
                    spender_address: log.args[1],
                    coin_amount: coinAmount,
                    coin_usd: tokenId === TokenId.GVT
                        ? await getGvtValue(log.args[2])
                        : coinAmount,
                    creation_date: moment.utc(),
                });
        }

        //console.log('here approvals:', approvals);

        return {
            status: QUERY_SUCCESS,
            data: approvals,
        };
    } catch (err) {
        const msg = `[side: ${side}]: ${err}`;
        showError('personalStatsApprovalsParser.ts->personalStatsApprovalsParser()', msg);
        return errorObj(msg);
    }
};

export {
    personalStatsApprovalsParser,
};



/*
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

*/

//TODO: can't return false or approvals (not TS rulez)
/*
const personalStatsApprovalsParser = async (
    contractVersion: ContractVersion,
    globalNetwork: GlobalNetwork,
    logs: any,
    side: Transfer,
    account: string,
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
*/