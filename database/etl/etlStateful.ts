import { QUERY_SUCCESS } from '../constants';
import { query } from '../handler/queryHandler';
import { getNetwork } from '../common/globalUtil';
import { loadStateful } from '../loader/loadStateful';
import { ContractNames } from '../../registry/registry';
import {
    showInfo,
    showError,
} from '../handler/logHandler';
import {
    Bool,
    EventName as EV,
    NetworkName,
    GlobalNetwork as GN
} from '../types';

//const network = getNetwork(GN.ETHEREUM);


const etlStateful = async () => {
    try {

        // const res = await query('select_max_block_vesting_bonus.sql', []);
        // if (res.status === QUERY_SUCCESS) {
        // const lastBlock = res.rows[0].last_block;
        // if (lastBlock) {

        // TODO: send the networkId

        await loadStateful(
            EV.DEPOSIT_HANDLER,
            ContractNames.depositHandler,
            14300828,
            14300829
        );

        await loadStateful(
            EV.DEPOSIT_STAKER,
            ContractNames.LPTokenStakerV2,
            14400716,
            14400718
        );

        await loadStateful(
            EV.WITHDRAWAL_HANDLER,
            ContractNames.withdrawHandler,
            14401090,
            14401092
        );

        await loadStateful(
            EV.TRANSFER,
            ContractNames.GroDAOToken,
            14410135,
            14410137
        );


        //     } else {
        //         showError(
        //             'etlStateful.ts->etlStateful()',
        //             'No data found in table USER_VESTING_BONUS'
        //         );
        //     }
        // } else {
        //     showError(
        //         'etlStateful.ts->etlStateful()',
        //         'Error while retrieving max block from table USER_VESTING_BONUS'
        //     );
        // }
    } catch (err) {
        showError('etlStateful.ts->etlStateful()', err);
        return;
    }
}

export {
    etlStateful,
}
