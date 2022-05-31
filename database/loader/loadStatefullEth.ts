import { query } from '../handler/queryHandler';
import { errorObj } from '../common/globalUtil';
import { ContractNames as CN } from '../../registry/registry';
import { showError } from '../handler/logHandler';
import { EventName as EV } from '../types';


const loadStatefulEth = async (
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
        case EV.Harvested:
            res = await query('insert_ev_gro_strategy_harvest.sql', event);
            break;
        default:
            const msg = `Event name (${eventName}) for contract <${contractName}> not found before inserting data into DB`;
            showError('loadStateful.ts->insertEth()', msg);
            return errorObj(msg);
    }
    return res;
}

export {
    loadStatefulEth,
}
