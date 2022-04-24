
import { ICall } from '../interfaces/ICall';
import { query } from '../handler/queryHandler';
import { isPlural } from '../common/globalUtil';
import { getStatefulEvents } from '../listener/getStatefulEvents';
import { eventParser } from '../parser/statefulParser';
import { isContractDeployed } from '../common/deployedUtil';
import {
    showInfo,
    showError
} from '../handler/logHandler';
import {
    QUERY_ERROR,
    QUERY_SUCCESS
} from '../constants';
import {
    NetworkId,
    EventName as EV,
} from '../types';


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
    contractName: string,
    _fromBlock: number,
    toBlock: number
): Promise<boolean> => {
    try {

        const {
            isDeployed,
            fromBlock
        } = await isContractDeployed(contractName, eventName, _fromBlock, toBlock);

        if (isDeployed) {
            
            const events = await getStatefulEvents(
                networkId,
                eventName,
                contractName,
                fromBlock,
                toBlock,
            );
    
            if (events.status === QUERY_SUCCESS) {
                let rows_ev = 0;
                let rows_tx = 0;
    
                const result: ICall = await eventParser(
                    events.data,
                    eventName,
                    contractName,
                );
    
                if (result.status === QUERY_SUCCESS) {
    
                    // Convert params from object to array
                    let events = [];
                    let transactions = [];
                    for (const param of result.data.events)
                        events.push(Object.values(param));
                    for (const param of result.data.transactions)
                        transactions.push(Object.values(param));
    
                    for (let i = 0; i < events.length; i++) {
    
                        let res;
    
                        // Insert events into the DB
                        switch (eventName) {
                            case EV.LogDeposit:
                            case EV.LogNewDeposit:
                                res = await query('insert_ev_deposits.sql', events[i]);
                                break;
                            case EV.LogWithdraw:
                            case EV.LogWithdrawal:
                            case EV.LogNewWithdrawal:
                                res = await query('insert_ev_withdrawals.sql', events[i]);
                                break;
                            case EV.LogMultiWithdraw:
                                res = await query('insert_ev_multi_withdrawals.sql', events[i]);
                                break;
                            case EV.Transfer:
                                res = await query('insert_ev_transfers.sql', events[i]);
                                break;
                            case EV.Approval:
                                res = await query('insert_ev_approvals.sql', events[i]);
                                break;
                            case EV.LogClaim:
                            case EV.LogMultiClaim:
                            case EV.LogBonusClaimed:
                                res = await query('insert_ev_claims.sql', events[i]);
                                break;
                            case EV.LogStrategyReported:
                                res = await query('insert_ev_strategy_reported.sql', events[i]);
                                break;
                            case EV.LogNewReleaseFactor:
                                res = await query('insert_ev_new_release_factor.sql', events[i]);
                                break;
                            default:
                                showError(
                                    'loadStateful.ts->loadStateful()',
                                    `Event name (${eventName}) for contract <${contractName}> not found before inserting data into DB`
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
    
                        // Insert transactions into the DB
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
    
                    if (rows_ev > 0)
                        showInfo(`Added ${rows_ev} <${eventName}> event${isPlural(rows_ev)} for contract <${contractName}>`);
                    if (rows_tx > 0)
                        showInfo(`Added ${rows_tx} transaction${isPlural(rows_tx)} linked to <${eventName}> event`);
                }
            } else {
                showError(
                    'loadStateful.ts->loadStateful()',
                    `Error while retrieving <${eventName}> events for contract <${contractName}>`
                );
                return false;
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