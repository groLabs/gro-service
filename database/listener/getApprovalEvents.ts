import { getEvents } from '../../common/logFilter';
import {
    QUERY_ERROR,
    QUERY_SUCCESS,
} from '../constants';
import { getFilterEvents } from '../../common/logFilter';
import {
    getCoinApprovalFilters,
    getContractHistoryEventFilters,
} from '../../common/filterGenerateTool';
import {
    showError,
    showWarning,
} from '../handler/logHandler';
import { EventResult } from '../../common/commonTypes';
import { isDepositOrWithdrawal } from '../common/personalUtil';
import { ContractNames } from '../../registry/registry';
import { ICall } from '../interfaces/ICall';
import {
    errorObj,
    getProvider,
    getProviderAvax
} from '../common/globalUtil';
import {
    TokenId,
    Transfer,
} from '../types';


// Get all approval events for a given block range
// TODO *** TEST IF THERE ARE NO LOGS TO PROCESS ***
const getApprovalEvents = async (
    filter: any,
    side: Transfer,
): Promise<ICall> => {
    try {

        const logPromises = [];
        const isAvax = side >= 500 && side < 1000 ? true : false;

            const result: EventResult = await getEvents(
                filter.filter,
                filter.interface,
                isAvax ? getProviderAvax() : getProvider()
            );

            if (result.status === QUERY_ERROR) {
                showError(
                    'getTransferEvents.ts->getTransferEvents()',
                    `Error while retrieving transfer events -> [side:${side}]: ${result.data}`
                );
                return errorObj(
                    `Error in getTransferEvents->getEvents(): [side:${side}]: ${result.data}`
                );
            }

            if (result.data.length > 0) {
                logPromises.push(result.data);
            }

        let logResults = await Promise.all(logPromises);

        return {
            status: QUERY_SUCCESS,
            data: logResults,
        };

    } catch (err) {
        showError(
            'getApprovalEvents.ts->getApprovalEvents()',
            `[side: ${side}]: ${err}`
        );
        return errorObj(err);
    }
};

export { getApprovalEvents };
