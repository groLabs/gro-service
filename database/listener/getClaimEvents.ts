import { getEvents } from '../../common/logFilter';
import { getLatestContractEventFilter, } from '../../common/filterGenerateTool';
import { ContractNames } from '../../registry/registry';
import { showError } from '../handler/logHandler';
import { EventResult } from '../../common/commonTypes';
import { ICall } from '../interfaces/ICall';
import {
    QUERY_ERROR,
    QUERY_SUCCESS
} from '../constants';
import {
    errorObj,
    getProvider,
} from '../common/globalUtil';


const getClaimEvents = async (
    fromBlock: number,
    toBlock: any,
): Promise<ICall> => {
    try {
        const eventType: string = 'LogBonusClaimed';
        const contractName: string = ContractNames.GroHodler;
        const filter = getLatestContractEventFilter(
            'default',
            contractName,
            eventType,
            fromBlock,
            toBlock,
            [null, null],
        );

        const event: EventResult = await getEvents(
            filter.filter,
            filter.interface,
            getProvider(),
        );

        if (event.status === QUERY_ERROR) {
            showError(
                'getClaimEvents.ts->getClaimEvents()',
                `Error while retrieving claim events: ${event.data}`
            );
            return errorObj(`Error while retrieving claim events: ${event.data}`);
        }

        return {
            status: QUERY_SUCCESS,
            data: event.data,
        };

    } catch (err) {
        showError('getClaimEvents.ts->getClaimEvents()', err);
        return errorObj(err);
    }
}

export {
    getClaimEvents,
}
