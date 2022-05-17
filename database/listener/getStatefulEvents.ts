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
/// @param  filter The filter to apply when retrieving events (only used in approval events)
/// @return An array of raw events
const getStatefulEvents = async (
    networkId: NetworkId,
    eventName: string,
    contractName: string,
    fromBlock: number,
    toBlock: any,
    filter = [],
): Promise<ICall> => {
    try {
        let events: EventResult = {
            status: 200,
            data: []
        }

        // Generate filters on all valid contract versions for a given block range
        const filters = getValidContractHistoryEventFilters(
            'default',
            contractName,
            eventName,
            fromBlock,
            toBlock,
            filter
        );
        //console.log('filters:', filters);

        // Retrieve all events for every filter
        for (const filter of filters) {
            const tempEvents = await getEvents(
                filter.filter,
                filter.interface,
                (networkId === NetworkId.AVALANCHE) ? getProviderAvax() : getProvider(),
            );
            if (tempEvents.status === QUERY_ERROR) {
                showError(
                    'getStatefulEvents.ts->getStatefulEvents()',
                    `Error while retrieving events: ${events.data}`
                );
                return errorObj(`Error while retrieving events: ${events.data}`);
            } else if (tempEvents.data.length > 0) {
                events.data.push(...tempEvents.data);
            }
        }

        let tx;
        let block;
        const numEvents = events.data.length;

        showInfo(`Processing ${numEvents} <${eventName}> event${isPlural(numEvents)} for contract <${contractName}>`);

        for (let i = 0; i < numEvents; i++) {

            const log = events.data[i];

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

        return {
            status: QUERY_SUCCESS,
            data: events.data,
        };

    } catch (err) {
        showError('getStatefulEvents.ts->getStatefulEvents()', err);
        return errorObj(err);
    }
}

export {
    getStatefulEvents,
}
