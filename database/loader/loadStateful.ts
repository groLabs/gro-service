
import { ICall } from '../interfaces/ICall';
import { query } from '../handler/queryHandler';
import { getMultipleResponse } from '../common/pgUtil';
import {
    isPlural,
    errorObj
} from '../common/globalUtil';
import { getStableContractNames } from '../common/statefulUtil'
import { getStatefulEvents } from '../listener/getStatefulEvents';
import { eventParser } from '../parser/statefulParser';
import { isContractDeployed } from '../common/deployedUtil';
import { getLatestContractsAddress } from '../../registry/registryLoader';
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


//TODO: define return type ICall
const insertAvax = async (
    eventName: string,
    contractName: string,
    event: any
) => {
    try {
        let res;
        switch (eventName) {
            case EV.LogDeposit:
                res = await query('insert_ev_lab_deposits.sql', event);
                break;
            case EV.LogWithdrawal:
                res = await query('insert_ev_lab_withdrawals.sql', event);
                break;
            case EV.Transfer:
                res = await query('insert_ev_transfers.sql', event);
                break;
            case EV.Approval:
                res = await query('insert_ev_approvals.sql', event);
                break;
            case EV.LogClaim:
                res = await query('insert_ev_lab_claims.sql', event);
                break;
            case EV.LogStrategyReported:
                res = await query('insert_ev_lab_strategy_reported.sql', event);
                break;
            case EV.LogNewReleaseFactor:
                res = await query('insert_ev_lab_new_release_factor.sql', event);
                break;
            case EV.AnswerUpdated:
                res = await query('insert_ev_price.sql', event);
                break;
            case EV.LogNewPositionOpened:
                const resOpen = await Promise.all([
                    query('insert_ev_ah_positions.sql', event[0]),
                    query('insert_ev_ah_position_opened.sql', event[1]),
                ]);
                res = getMultipleResponse(resOpen);
                break;
            case EV.LogPositionClosed:
                const respClose = await Promise.all([
                    query('update_ev_ah_positions_on_close.sql', event[0]),
                    query('insert_ev_ah_position_closed.sql', event[1]),
                ]);
                res = getMultipleResponse(respClose);
                break;
            case EV.LogPositionAdjusted:
                const respAdjust = await Promise.all([
                    query('update_ev_ah_positions_on_adjust.sql', event[0]),
                    query('insert_ev_ah_position_adjusted.sql', event[1]),
                ]);
                res = getMultipleResponse(respAdjust);
                break;
            default:
                const msg = `Event name (${eventName}) for contract <${contractName}> not found before inserting data into DB`;
                showError('loadStateful.ts->insertAvax()', msg);
                return errorObj(msg);
        }
        return res;
    } catch (error) {
        return errorObj('Error in statefulParserAvax.ts->insertAvax()');
    }
}

//TODO: define return type ICall
const insertEth = async (
    eventName: string,
    contractName: string,
    event: any
) => {
    let res;
    switch (eventName) {
        case EV.LogNewDeposit:
            //TODO
            res = await query('insert_ev_gro_deposits.sql', event);
            break;
        case EV.LogNewWithdrawal:
            //TODO
            res = await query('insert_ev_gro_withdrawals.sql', event);
            break;
        case EV.LogNewDeposit:
            //TODO
            res = await query('insert_ev_dao_deposits.sql', event);
            break;
        case EV.LogWithdraw:
        case EV.LogMultiWithdraw:
            //TODO/Review
            res = await query('insert_ev_multi_withdrawals.sql', event);
            break;
        case EV.Transfer:
            res = await query('insert_ev_transfers.sql', event);
            break;
        case EV.Approval:
            res = await query('insert_ev_approvals.sql', event);
            break;
        //TODO/Review
        case EV.LogClaim:
        case EV.LogMultiClaim:
        case EV.LogBonusClaimed:
            res = await query('insert_ev_dao_claims.sql', event);
            break;
        default:
            const msg = `Event name (${eventName}) for contract <${contractName}> not found before inserting data into DB`;
            showError('loadStateful.ts->insertAvax()', msg);
            return errorObj(msg);
    }
    return res;
}

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
    toBlock: number
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

            // For approval events, retrieve all associated stablecoins
            const isApproval = (eventName === EV.Approval) ? true : false;
            const contractNames = isApproval
                ? getStableContractNames(networkId, _contractName)
                : [_contractName];

            for (const contractName of contractNames) {

                const events = await getStatefulEvents(
                    networkId,
                    eventName,
                    contractName,
                    fromBlock,
                    toBlock,
                    isApproval
                        ? [null, getLatestContractsAddress()[_contractName].address]
                        : []
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
                                res = await insertAvax(
                                    eventName,
                                    contractName,
                                    events[i]
                                );
                            } else if (
                                networkId === NetworkId.MAINNET
                                || networkId === NetworkId.ROPSTEN
                            ) {
                                res = await insertEth(
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