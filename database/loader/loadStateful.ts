
import { ICall } from '../interfaces/ICall';
import { query } from '../handler/queryHandler';
import {
    isPlural,
    errorObj
} from '../common/globalUtil';
import { getStableContractNames } from '../common/statefulUtil'
import { getStatefulEvents } from '../listener/getStatefulEvents';
import { eventParser } from '../parser/statefulParser';
import { isContractDeployed } from '../common/deployedUtil';
import { ContractNames as CN } from '../../registry/registry';
import { getLatestContractsAddress } from '../../registry/registryLoader';
import {
    showInfo,
    showError,
    showWarning,
} from '../handler/logHandler';
import {
    QUERY_ERROR,
    QUERY_SUCCESS
} from '../constants';
import {
    NetworkId,
    EventName as EV,
} from '../types';


///@dev For AH tables, if an event was already inserted, do not update AH positions table to prevent
///     repeating the calculation for field <want_open>
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
            case EV.LogHarvested:
                res = await query('insert_ev_strategy_harvest.sql', event);
                break;
            case EV.LogNewStrategyHarvest:
                res = await query('insert_ev_vault_harvest.sql', event);
                break;
            case EV.LogNewPositionOpened:
                const resOpen = await query('insert_ev_ah_position_opened.sql', event[0]);
                if (resOpen.status === QUERY_SUCCESS && resOpen.rowCount > 0) {
                    res = await query('insert_ev_ah_positions_on_open.sql', event[1]);
                    if (res.status === QUERY_SUCCESS && res.rowCount === 0) {
                        showWarning(
                            'statefulParserAvax.ts->insertAvax()',
                            `Open position inserted into <EV_LAB_AH_POSITION_OPENED> but no record inserted into <EV_LAB_AH_POSITIONS> for tx hash ${event[0][1]}`
                        );
                    }
                } else {
                    res = resOpen;
                }
                break;
            case EV.LogPositionClosed:
                const resClose = await query('insert_ev_ah_position_closed.sql', event[0]);
                if (resClose.status === QUERY_SUCCESS && resClose.rowCount > 0) {
                    res = await query('update_ev_ah_positions_on_close.sql', event[1]);
                    if (res.status === QUERY_SUCCESS && res.rowCount === 0) {
                        showWarning(
                            'statefulParserAvax.ts->insertAvax()',
                            `Close position inserted into <EV_LAB_AH_POSITION_CLOSED> but no record updated in <EV_LAB_AH_POSITIONS> for tx hash ${event[0][1]}`
                        );
                    }
                } else {
                    res = resClose;
                }
                break;
            case EV.LogPositionAdjusted:
                const resAdjust = await query('insert_ev_ah_position_adjusted.sql', event[0]);
                if (resAdjust.status === QUERY_SUCCESS && resAdjust.rowCount > 0) {
                    res = await query('update_ev_ah_positions_on_adjust.sql', event[1]);
                    if (res.status === QUERY_SUCCESS && res.rowCount === 0) {
                        showWarning(
                            'statefulParserAvax.ts->insertAvax()',
                            `Adjust position inserted into <EV_LAB_AH_POSITION_ADJUSTED> but no record updated in <EV_LAB_AH_POSITIONS> for tx hash ${event[0][1]}`
                        );
                    }
                } else {
                    res = resAdjust;
                }
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

const insertEth = async (
    eventName: string,
    contractName: string,
    event: any
) => {
    let res;
    switch (eventName) {
        case EV.LogNewDeposit:
            res = await query('insert_ev_gro_deposits.sql', event);
            break;
        case EV.LogNewWithdrawal:
            res = await query('insert_ev_gro_withdrawals.sql', event);
            break;
        case EV.LogEmergencyWithdrawal:
            res = await query('insert_ev_gro_emergency_withdrawals.sql', event);
            break;
        case EV.Transfer:
            res = await query('insert_ev_transfers.sql', event);
            break;
        case EV.Approval:
            res = await query('insert_ev_approvals.sql', event);
            break;
        case EV.LogDeposit:
            res = await query('insert_ev_staker_deposits.sql', event);
            break;
        case EV.LogWithdraw:
        case EV.LogMultiWithdraw:
            res = await query('insert_ev_staker_withdrawals.sql', event);
            break;
        case EV.LogBonusClaimed:
            res = await query('insert_ev_hodler_claims.sql', event);
            break;
        case EV.LogMigrateUser:
            res = await query('insert_ev_staker_users_migrated.sql', event);
            break;
        case EV.AnswerUpdated:
            res = await query('insert_ev_price.sql', event);
            break;
        case EV.LogClaim:
        case EV.LogMultiClaim:
            if (contractName === CN.LPTokenStakerV1
                || contractName === CN.LPTokenStakerV2) {
                res = await query('insert_ev_staker_claims.sql', event);
            } else if (contractName === CN.Airdrop) {
                res = await query('insert_ev_airdrop_claims.sql', event);
            } else {
                const msg = `Event name (${eventName}) for contract <${contractName}> not found before inserting data into DB`;
                showError('loadStateful.ts->insertEth()', msg);
                return errorObj(msg);
            }
            break;
        case EV.LogPnLExecution:
            res = await query('insert_ev_gro_pnl_execution.sql', event);
            break;
        default:
            const msg = `Event name (${eventName}) for contract <${contractName}> not found before inserting data into DB`;
            showError('loadStateful.ts->insertEth()', msg);
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

            const isApproval = (eventName === EV.Approval)
                ? true
                : false;

            // - For transfer events of stablecoins, filter by emergencyHandler 
            //   (for the aggregation layer to identify emergency withdrawals)
            // - For approval events, retrieve all associated stablecoins
            const filter =
                (_contractName === CN.DAI || _contractName === CN.USDC || _contractName === CN.USDT)
                    ? [getLatestContractsAddress()[CN.emergencyHandler].address, null]
                    : !isApproval
                        ? []
                        : (networkId === NetworkId.AVALANCHE)
                            ? [null, getLatestContractsAddress()[_contractName].address]
                            : (_contractName !== CN.groVault && _contractName !== CN.powerD)
                                ? [null, getLatestContractsAddress()[CN.depositHandler].address] // For eth, to: depositHandler
                                : [];

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