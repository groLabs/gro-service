// Retrieve events for the new Listener stateful method
import moment from 'moment';
import { soliditySha3 } from 'web3-utils';
import { 
    getEvents,
    getFilterEvents,
} from '../../common/logFilter';
import { 
    getLatestContractEventFilter,
    getContractHistoryEventFilters,
} from '../../common/filterGenerateTool';
import { EventResult } from '../../common/commonTypes';
import { ICall } from '../interfaces/ICall';
import { NetworkId } from '../types';
import {
    showInfo,
    showError,
} from '../handler/logHandler';
import {
    QUERY_ERROR,
    QUERY_SUCCESS
} from '../constants';
import {
    isPlural,
    errorObj,
    getProvider,
    getProviderAvax,
    getBlockData,
    getBlockDataAvax,
} from '../common/globalUtil';


const getStatefulEvents = async (
    networkId: NetworkId,
    eventType: string,
    contractName: string,
    fromBlock: number,
    toBlock: any,
): Promise<ICall> => {
    try {
        // TODO: should be contract history rather than latest contract
        
        const filter = getLatestContractEventFilter(
        //const filters = getContractHistoryEventFilters(
            'default',
            contractName,
            eventType,
            fromBlock,
            toBlock,
            //[null, null],
        );

        const event: EventResult = await getEvents(
        //const event = await getFilterEvents(
            filter.filter,
            filter.interface,
            (networkId === NetworkId.AVALANCHE) ? getProviderAvax() : getProvider(),
        );

        if (event.status === QUERY_ERROR) {
            showError(
                'getStatefulEvents.ts->getStatefulEvents()',
                `Error while retrieving events: ${event.data}`
            );
            return errorObj(`Error while retrieving events: ${event.data}`);
        } else {
            let tx;
            let block;

            const numEvents = event.data.length;

            showInfo(`Processing ${numEvents} <${eventType}> event${isPlural(numEvents)} for contract <${contractName}>`);

            for (let i = 0; i < numEvents; i++) {

                const log = event.data[i];

                [tx, block] = (networkId === NetworkId.AVALANCHE)
                    ? await Promise.all([
                        getProviderAvax()
                            .getTransactionReceipt(log.transactionHash)
                            .catch((err) => {
                                showError('getStatefulEvents.ts->getStatefulEvents()', err);
                            }),
                        getBlockDataAvax(log.blockNumber)
                    ])
                    : await Promise.all([
                        getProvider()
                            .getTransactionReceipt(log.transactionHash)
                            .catch((err) => {
                                showError('getStatefulEvents.ts->getStatefulEvents()', err);
                            }),
                        getBlockData(log.blockNumber)
                    ]);

                const transactionId = soliditySha3(
                    { type: 'uint96', value: log.blockNumber },       // block number
                    { type: 'uint96', value: networkId.toString() },  // network id
                    { type: 'string', value: log.transactionHash },   // tx hash
                    { type: 'string', value: tx.blockHash },          // block hash
                );

                log.networkId = networkId;
                log.transactionId = transactionId;
                log.blockHash = tx.blockHash;
                log.blockTimestamp = block.timestamp;
                log.blockDate = moment.unix(block.timestamp).utc();
            }
        }

        return {
            status: QUERY_SUCCESS,
            data: event.data,
        };

    } catch (err) {
        showError('getStatefulEvents.ts->getStatefulEvents()', err);
        return errorObj(err);
    }
}

export {
    getStatefulEvents,
}
