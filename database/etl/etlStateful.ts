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

/*
        await loadStateful(
            getNetwork(GN.ETHEREUM).id,
            EV.LogNewDeposit,
            ContractNames.depositHandler,
            14300828,
            14300829
        );

        await loadStateful(
            getNetwork(GN.ETHEREUM).id,
            EV.LogDeposit,
            ContractNames.LPTokenStakerV2,
            14400716,
            14400718
        );

        await loadStateful(
            getNetwork(GN.ETHEREUM).id,
            EV.LogNewWithdrawal,
            ContractNames.withdrawHandler,
            14401090,
            14401092
        );

        await loadStateful(
            getNetwork(GN.ETHEREUM).id,
            EV.Transfer,
            ContractNames.GroDAOToken,
            14410135,
            14410137
        );

        await loadStateful(
            getNetwork(GN.ETHEREUM).id,
            EV.Approval,
            ContractNames.groVault,
            14528165,
            14528175
        );

        await loadStateful(
            getNetwork(GN.ETHEREUM).id,
            EV.LogBonusClaimed,
            ContractNames.GroHodler,
            14531319,
            14531321
        );

        await loadStateful(
            getNetwork(GN.ETHEREUM).id,
            EV.LogClaim,
            ContractNames.LPTokenStakerV2,
            14531487,
            14531489
        );

        await loadStateful(
            getNetwork(GN.ETHEREUM).id,
            EV.LogMultiClaim,
            ContractNames.LPTokenStakerV2,
            14530487,
            14531489
        );

        await loadStateful(
            getNetwork(GN.AVALANCHE).id,
            EV.LogDeposit,
            ContractNames.AVAXDAIVault_v1_7,
            13026261,
            13026263,
        );

        await loadStateful(
            getNetwork(GN.AVALANCHE).id,
            EV.LogWithdrawal,
            ContractNames.AVAXDAIVault_v1_7,
            12028040,
            12028042,
        );

        await loadStateful(
            getNetwork(GN.AVALANCHE).id,
            EV.Transfer,
            ContractNames.AVAXDAIVault_v1_7,
            10908842,
            10908844,
        );

        await loadStateful(
            getNetwork(GN.AVALANCHE).id,
            EV.LogStrategyReported,
            ContractNames.AVAXDAIVault_v1_7,
            13064027,
            13064029,
        );
*/
        await loadStateful(
            getNetwork(GN.AVALANCHE).id,
            EV.LogNewReleaseFactor,
            ContractNames.AVAXDAIVault_v1_7,
            10364122 ,
            13064029,
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
