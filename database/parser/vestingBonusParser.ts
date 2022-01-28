import moment from 'moment';
import { ICall } from '../interfaces/ICall';
import { QUERY_SUCCESS } from '../constants';
import { showError, } from '../handler/logHandler';
import {
    Base,
    GlobalNetwork as GN,
} from '../types';
import {
    errorObj,
    getNetwork,
    parseAmount
} from '../common/globalUtil';


const vestingBonusParser = async (logs: any): Promise<ICall> => {
    try {
        const claims = [];
        for (const log of logs) {
            claims.push({
                block_number: log.blockNumber,
                tx_hash: log.transactionHash,
                network_id: getNetwork(GN.ETHEREUM).id,
                user_address: log.args[0],
                coin_amount: parseAmount(log.args[1], Base.D18),
                creation_date: moment.utc(),
            });
        }
        return {
            status: QUERY_SUCCESS,
            data: claims,
        };
    } catch (err) {
        showError('vestingBonusParser.ts->vestingBonusParser()', err);
        return errorObj(err);
    }
};

export {
    vestingBonusParser,
};
