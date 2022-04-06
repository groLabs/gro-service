// Retrieve events for the new Listener stateful method
import moment from 'moment';
import { soliditySha3 } from 'web3-utils';
import { getEvents } from '../../common/logFilter';
import { getLatestContractEventFilter, } from '../../common/filterGenerateTool';
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
    getProviderAvax,
} from '../common/globalUtil';
import {
    getBlockData,
    getBlockDataAvax,
} from '../common/globalUtil';
import { NetworkId } from '../types';


const getStatefulEvents = async (
    networkId: NetworkId,
    eventType: string,
    contractName: string,
    fromBlock: number,
    toBlock: any,
): Promise<ICall> => {
    try {
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

            for (let i = 0; i < event.data.length; i++) {

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

                // const [
                //     tx,
                //     block
                // ] = await Promise.all([
                //     getProvider()
                //         .getTransactionReceipt(log.transactionHash)
                //         .catch((err) => {
                //             showError('getStatefulEvents.ts->getStatefulEvents()', err);
                //         }),
                //     getBlockData(log.blockNumber)
                // ]);

                //console.log('log:', log);
                //console.log('tx:', tx);
                //console.log('block:', block);

                const transactionId = soliditySha3(
                    { type: 'uint96', value: log.blockNumber },       // block number
                    { type: 'uint96', value: '1' },                   // network id
                    { type: 'string', value: log.transactionHash },   // tx hash
                    { type: 'string', value: tx.blockHash },          // block hash
                );

                log.networkId = 1;  //TODO
                log.transactionId = transactionId;
                log.blockHash = tx.blockHash;
                log.blockTimestamp = block.timestamp;
                log.blockDate = moment.unix(block.timestamp).utc();

                //console.log('loguito:', log);
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
