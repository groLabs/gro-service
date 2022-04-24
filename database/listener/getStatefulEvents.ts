// Retrieve events for the new Listener stateful method
import moment from 'moment';
import { soliditySha3 } from 'web3-utils';
import { getEvents } from '../../common/logFilter';
import { getValidContractHistoryEventFilters } from '../../common/filterGenerateTool';
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


/// @notice Create event filters and retrieve events and related transactions given 
///         a network, event name, contract name and range of blocks
/// @param  networkId The blockchain network identifier
/// @param  eventName The event name
/// @param  contractName The contract name
/// @param  fromBlock The start block to listen for events
/// @param  toBlock The end block to listen for events
/// @return An array of raw events
const getStatefulEvents = async (
    networkId: NetworkId,
    eventName: string,
    contractName: string,
    fromBlock: number,
    toBlock: any,
): Promise<ICall> => {
    try {

        //console.log('contractName:', contractName, 'eventName:', eventName, 'fromBlock:', fromBlock, 'toBlock:', toBlock);

        const filters = getValidContractHistoryEventFilters(
            'default',
            contractName,
            eventName,
            fromBlock,
            toBlock,
        );

        // console.log('filters:', filters);

        let event: EventResult;
        for (const filter of filters) {
            event = await getEvents(
                filter.filter,
                filter.interface,
                (networkId === NetworkId.AVALANCHE) ? getProviderAvax() : getProvider(),
            );
        }

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

            showInfo(`Processing ${numEvents} <${eventName}> event${isPlural(numEvents)} for contract <${contractName}>`);

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
