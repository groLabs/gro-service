import { QUERY_SUCCESS } from '../constants';
import { query } from '../handler/queryHandler';
import { getNetwork } from '../common/globalUtil';
import { loadStateful } from '../loader/loadStateful';
import { ContractNames as CN } from '../../registry/registry';
import {
    showInfo,
    showError,
} from '../handler/logHandler';
import {
    EventName as EV,
    GlobalNetwork as GN
} from '../types';

/*
    TBD:
    1) All ETH
    2) All AVAX 
*/

const etlStateful = async (
    globalNetwork: GN,
    from: string,
    to: string,
) => {
    try {

        let result = [];

        if (globalNetwork === GN.ETHEREUM) {
            result.push([
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogNewDeposit,
                    CN.depositHandler,
                    14300828,
                    14300829
                ),
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogDeposit,
                    CN.LPTokenStakerV2,
                    14400716,
                    14400718
                ),
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogNewWithdrawal,
                    CN.withdrawHandler,
                    14401090,
                    14401092
                ),
                //Not tested yet (no data available)
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogMultiWithdraw,
                    CN.LPTokenStakerV2,
                    14268645 ,
                    14536723
                ),
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.Transfer,
                    CN.GroDAOToken,
                    14410135,
                    14410137
                ),
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.Approval,
                    CN.groVault,
                    14528165,
                    14528175
                ),
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogBonusClaimed,
                    CN.GroHodler,
                    14531319,
                    14531321
                ),
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogClaim,
                    CN.LPTokenStakerV2,
                    14531487,
                    14531489
                ),
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogMultiClaim,
                    CN.LPTokenStakerV2,
                    14530487,
                    14531489
                ),
            ]);
        }

        if (globalNetwork === GN.AVALANCHE) {
            result.push([
                loadStateful(
                    getNetwork(GN.AVALANCHE).id,
                    EV.LogDeposit,
                    CN.AVAXDAIVault_v1_7,
                    13026261,
                    13026263,
                ),
                loadStateful(
                    getNetwork(GN.AVALANCHE).id,
                    EV.LogWithdrawal,
                    CN.AVAXDAIVault_v1_7,
                    12028040,
                    12028042,
                ),

                loadStateful(
                    getNetwork(GN.AVALANCHE).id,
                    EV.Transfer,
                    CN.AVAXDAIVault_v1_7,
                    10908842,
                    10908844,
                ),

                loadStateful(
                    getNetwork(GN.AVALANCHE).id,
                    EV.LogStrategyReported,
                    CN.AVAXDAIVault_v1_7,
                    13064027,
                    13064029,
                ),

                loadStateful(
                    getNetwork(GN.AVALANCHE).id,
                    EV.LogNewReleaseFactor,
                    CN.AVAXDAIVault_v1_7,
                    10364122,
                    13064029,
                )
            ]);
        }

        const res = await Promise.all(result);

        if (res.every(Boolean)) {
            console.log('All gucci!')
        }


    } catch (err) {
        showError('etlStateful.ts->etlStateful()', err);
        return;
    }
}

export {
    etlStateful,
}
