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
import {
    LISTENER_BLOCKS_ETH,
    LISTENER_BLOCKS_AVAX,
} from '../constants'


const etlListener = async (
    globalNetwork: GN,
    from: number,
    to: number,
    offset: number,
): Promise<boolean> => {
    try {

        const LISTENER_BATCH = (globalNetwork === GN.ETHEREUM)
            ? LISTENER_BLOCKS_ETH
            : (globalNetwork === GN.AVALANCHE) 
                ? LISTENER_BLOCKS_AVAX
                : 0;

        if (LISTENER_BATCH === 0) {
            showError(
                'etlStateful.ts->etlStateful()',
                'Only Ethereum or Avalanche can be processed'
            );
            return false;
        }

        const newOffset = (offset + LISTENER_BATCH >= to)
            ? to
            : offset + LISTENER_BATCH;

        const network = (globalNetwork === GN.ALL)
            ? 'Ethereum & Avalanche'
            : (globalNetwork === GN.ETHEREUM)
                ? 'Ethereum'
                : (globalNetwork === GN.AVALANCHE)
                    ? 'Avalanche'
                    : 'Unknown network';

        showInfo(`--==> Looking for events from blocks <${from}> to <${newOffset}> in ${network} <==--`);

        let result = [];

        if (globalNetwork === GN.ETHEREUM) {
            result.push(
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogNewDeposit,
                    CN.depositHandler,
                    from,
                    newOffset
                ),
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogDeposit,
                    CN.LPTokenStakerV2,
                    from,
                    newOffset
                ),
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogNewWithdrawal,
                    CN.withdrawHandler,
                    from,
                    newOffset
                ),
                //Not tested yet (no data available)
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogMultiWithdraw,
                    CN.LPTokenStakerV2,
                    from,
                    newOffset
                ),
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.Transfer,
                    CN.GroDAOToken,
                    from,
                    newOffset
                ),
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.Approval,
                    CN.groVault,
                    from,
                    newOffset
                ),
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogBonusClaimed,
                    CN.GroHodler,
                    from,
                    newOffset
                ),
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogClaim,
                    CN.LPTokenStakerV2,
                    from,
                    newOffset
                ),
                loadStateful(
                    getNetwork(GN.ETHEREUM).id,
                    EV.LogMultiClaim,
                    CN.LPTokenStakerV2,
                    from,
                    newOffset
                ),
            );
        }

        if (globalNetwork === GN.AVALANCHE) {
            result.push(
                loadStateful(
                    getNetwork(GN.AVALANCHE).id,
                    EV.LogDeposit,
                    CN.AVAXDAIVault_v1_7,
                    from,
                    newOffset,
                ),
                loadStateful(
                    getNetwork(GN.AVALANCHE).id,
                    EV.LogWithdrawal,
                    CN.AVAXDAIVault_v1_7,
                    from,
                    newOffset,
                ),
                loadStateful(
                    getNetwork(GN.AVALANCHE).id,
                    EV.Transfer,
                    CN.AVAXDAIVault_v1_7,
                    from,
                    newOffset,
                ),
                loadStateful(
                    getNetwork(GN.AVALANCHE).id,
                    EV.LogStrategyReported,
                    CN.AVAXDAIVault_v1_7,
                    from,
                    newOffset,
                ),
                loadStateful(
                    getNetwork(GN.AVALANCHE).id,
                    EV.LogNewReleaseFactor,
                    CN.AVAXDAIVault_v1_7,
                    from,
                    newOffset,
                )
            );
        }

        const res = await Promise.all(result);

        if (res.every(Boolean)) {
            showInfo(`Events from blocks <${from}> to <${newOffset}> for ${network} successfully processed`);
        } else {
            showError(
                'etlStateful.ts->etlStateful()',
                'Error/s found during ETL for events'
            );
            return false;
        }

        return (newOffset >= to)
            ? true
            : etlListener(globalNetwork, newOffset, to, newOffset);

    } catch (err) {
        showError('etlStateful.ts->etlStateful()', err);
        return false;
    }
}


export {
    etlListener,
}
