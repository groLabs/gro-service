
import { ICall } from '../interfaces/ICall';
import { query } from '../handler/queryHandler';
import { isPlural } from '../common/globalUtil';
import { getStableContractNames } from '../common/statefulUtil';
import { getStatefulEvents } from '../listener/getStatefulEvents';
import { eventParser } from '../parser/statefulParser';
import { isContractDeployed } from '../common/deployedUtil';
import {
    showInfo,
    showError,
} from '../handler/logHandler';
import {
    QUERY_ERROR,
    QUERY_SUCCESS
} from '../constants';
import {
    NetworkId,
    EventName as EV,
} from '../types';
import { loadStatefulEth } from './loadStatefullEth'
import { loadStatefulAvax } from './loadStatefulAvax';


/// @notice Load events into the database
/// @param  networkId The blockchain identifier
/// @param  eventName The event name
/// @param  contractName The contract name
/// @param  _fromBlock The start block to load events
/// @param  toBlock The end block to load events
/// @return True if no exceptions found; false otherwise
const loadStateful = async (
    networkId: NetworkId,
    eventName: EV,
    _contractName: string,
    _fromBlock: number,
    toBlock: number,
    filter: string[],
): Promise<boolean> => {
    try {
        // check whether the target contract is deployed within the block range
        const {
            isDeployed,
            fromBlock
        } = await isContractDeployed(_contractName, eventName, _fromBlock, toBlock);

        if (fromBlock < 0)
            return false;

        if (isDeployed) {

            const isApproval = (eventName === EV.Approval)
                ? true
                : false;

            const contractNames = (isApproval && networkId === NetworkId.AVALANCHE)
                ? getStableContractNames(networkId, _contractName)
                : [_contractName];

            for (const contractName of contractNames) {

                // For approval events:
                // AVAX: from Stablecoin to Vault
                // ETH: from Stablecoin/GVT/PWRD to deposit handler
                const events = await getStatefulEvents(
                    networkId,
                    eventName,
                    contractName,
                    fromBlock,
                    toBlock,
                    filter
                );

                if (events.status === QUERY_SUCCESS) {
                    let rows_ev = 0;
                    let rows_tx = 0;

                    const result: ICall = await eventParser(
                        networkId,
                        events.data,
                        eventName,
                        contractName,
                    );

                    if (result.status === QUERY_SUCCESS) {

                        // Convert params from object to array
                        let events = [];
                        let transactions = [];
                        for (const param of result.data.events) {
                            // When an event is inserted in multiple tables
                            if (Array.isArray(param)) {
                                let elems = [];
                                for (const elem of param) {
                                    elems.push(Object.values(elem));
                                }
                                events.push(elems);
                            } else {
                                events.push(Object.values(param));
                            }
                        }

                        for (const param of result.data.transactions)
                            transactions.push(Object.values(param));

                        for (let i = 0; i < events.length; i++) {

                            // STEP 1: Insert transactions into the DB
                            if (transactions[i]) {
                                const res2 = await query('insert_ev_transactions.sql', transactions[i]);

                                if (res2.status === QUERY_ERROR) {
                                    showError(
                                        'loadStateful.ts->loadStateful()',
                                        `Error while inserting transaction/s linked to event <${eventName}>`
                                    );
                                    return false;
                                }
                                rows_tx += res2.rowCount;
                            }

                            // STEP 2: Insert events into the DB
                            let res;
                            if (networkId === NetworkId.AVALANCHE) {
                                res = await loadStatefulAvax(
                                    eventName,
                                    contractName,
                                    events[i]
                                );
                            } else if (
                                networkId === NetworkId.MAINNET
                                || networkId === NetworkId.ROPSTEN
                            ) {
                                res = await loadStatefulEth(
                                    eventName,
                                    contractName,
                                    events[i]
                                );
                            } else {
                                showError(
                                    'loadStateful.ts->loadStateful()',
                                    `Unknown networkId <${networkId}>`
                                );
                                return false;
                            }

                            if (res.status === QUERY_ERROR) {
                                const tx = (transactions[i][5]) ? `in tx: ${transactions[i][5]}` : '';
                                showError(
                                    'loadStateful.ts->loadStateful()',
                                    `Error while inserting <${eventName}> events for contract <${contractName}> ${tx}`
                                );
                                return false;
                            }
                            rows_ev += res.rowCount;
                        }

                        if (rows_ev > 0)
                            showInfo(`Added ${rows_ev} <${eventName}> event${isPlural(rows_ev)} for contract <${contractName}>`);
                        if (rows_tx > 0)
                            showInfo(`Added ${rows_tx} transaction${isPlural(rows_tx)} linked to <${eventName}> event`);
                    } else {
                        return false;
                    }
                } else {
                    showError(
                        'loadStateful.ts->loadStateful()',
                        `Error while retrieving <${eventName}> events for contract <${contractName}>`
                    );
                    return false;
                }
            }
        }
        return true;
    } catch (err) {
        showError('loadStateful.ts->loadStateful()', err);
        return false;
    }
}

export {
    loadStateful,
}