import moment from 'moment';
import { getGroVault } from '../common/contractUtil';
import {
    errorObj,
    getNetwork,
    parseAmount
} from '../common/globalUtil';
import {
    Base,
    TokenId,
    Transfer,
    GlobalNetwork,
    ContractVersion,
} from '../types';
import { ICall } from '../interfaces/ICall';
import { showError } from '../handler/logHandler';
import {
    MAX_NUMBER,
    QUERY_SUCCESS,
} from '../constants';


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
