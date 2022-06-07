import { query } from '../handler/queryHandler';
import { errorObj } from '../common/globalUtil';
import { EventName as EV } from '../types';
import { QUERY_SUCCESS } from '../constants';
import {
    showError,
    showWarning,
} from '../handler/logHandler';



///@dev For AH tables, if an event was already inserted, do not update AH positions table to prevent
///     repeating the calculation for field <want_open>
const loadStatefulAvax = async (
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
                res = await query('insert_ev_strategy_reported.sql', event);
                break;
            case EV.LogNewReleaseFactor:
                res = await query('insert_ev_lab_new_release_factor.sql', event);
                break;
            case EV.AnswerUpdated:
                res = await query('insert_ev_price.sql', event);
                break;
            case EV.LogHarvested:
                res = await query('insert_ev_lab_strategy_harvest.sql', event);
                break;
            case EV.LogNewStrategyHarvest:
                res = await query('insert_ev_lab_vault_harvest.sql', event);
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

export {
    loadStatefulAvax,
}
