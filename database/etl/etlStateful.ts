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
} from '../constants';
import {
    checkDateRange,
    findBlockByDate,
    findBlockByDateAvax,
} from '../common/globalUtil';
import { generateDateRange } from '../common/personalUtil';


/// @notice Determine blocks to be processed based on start and end dates
///         and then call function etlStatefulByBlock()
/// @param  globalNetwork The blockchain network (1: Ethereum, 2: Avalanche)
/// @param  _fromDate The start date to process blocks in format 'DD/MM/YYYY'
/// @param  _toDdate The end date to process blocks in format 'DD/MM/YYYY'
/// @return True if no exceptions found; false otherwise
const etlStatefulByDate = async (
    globalNetwork: GN,
    _fromDate: string,
    _toDate: string,
): Promise<boolean> => {
    try {
        let fromBlock;
        let toBlock;

        if (checkDateRange(_fromDate, _toDate)) {

            // Calc dates to be processed
            const dates = generateDateRange(_fromDate, _toDate);
            const fromDate = dates[0].clone();
            const toDate = dates[dates.length - 1]
                .utc()
                .clone()
                .add(23, 'hours')
                .add(59, 'seconds')
                .add(59, 'minutes');

            if (globalNetwork === GN.ETHEREUM) {
                [fromBlock, toBlock] = await Promise.all([
                    findBlockByDate(fromDate, true),
                    findBlockByDate(toDate, false),
                ]);
            } else if (globalNetwork === GN.AVALANCHE) {
                [fromBlock, toBlock] = await Promise.all([
                    findBlockByDateAvax(fromDate, true),
                    findBlockByDateAvax(toDate, false),
                ]);
            } else {
                showError(
                    'etlStateful.ts->etlStatefulByDate()',
                    'Only Ethereum or Avalanche can be processed'
                );
                return false;
            }

            return await etlStatefulByBlock(
                globalNetwork,
                fromBlock.block,
                toBlock.block,
                fromBlock.block,
            );

        } else
            return false;

    } catch (err) {
        showError('etlStateful.ts->etlStatefulByDate()', err);
        return false;
    }
}

/// @notice Load events for the given network and from/to blocks
/// @dev    Event <LogNewReleaseFactor> is not applicable for Labs 1.0
/// @dev    Load is split in N batches through iterative calls, where N is
///         defined in constants->LISTENER_BLOCKS_ETH or LISTENER_BLOCKS_AVAX
/// @param  globalNetwork The blockchain network (1: Ethereum, 2: Avalanche)
/// @param  from The start block to load events
/// @param  to The end block to load events
/// @param  offset The offset to track the amount of iterations
/// @return True if no exceptions found; false otherwise
const etlStatefulByBlock = async (
    globalNetwork: GN,
    from: number,
    to: number,
    offset: number,
): Promise<boolean> => {
    try {
        if (from > 0 && to > 0) {

            const LISTENER_BATCH = (globalNetwork === GN.ETHEREUM)
                ? LISTENER_BLOCKS_ETH
                : (globalNetwork === GN.AVALANCHE)
                    ? LISTENER_BLOCKS_AVAX
                    : 0;

            if (LISTENER_BATCH === 0) {
                showError(
                    'etlStateful.ts->etlStatefulByBlock()',
                    'Only Ethereum or Avalanche can be processed'
                );
                return false;
            }

            const newOffset = (offset + LISTENER_BATCH >= to)
                ? to
                : offset + LISTENER_BATCH;

            const network = (globalNetwork === GN.ETHEREUM)
                ? 'Ethereum'
                : (globalNetwork === GN.AVALANCHE)
                    ? 'Avalanche'
                    : 'Unknown network';

            showInfo(`--==> Looking for events from blocks <${from}> to <${newOffset}> in ${network} <==--`);

            let result = [];

            if (globalNetwork === GN.ETHEREUM) {

                const groTokenContracts = [
                    CN.powerD,
                    CN.groVault,
                    CN.GroDAOToken,
                ];

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
                    // loadStateful(
                    //     getNetwork(GN.ETHEREUM).id,
                    //     EV.LogMultiWithdraw,
                    //     CN.LPTokenStakerV2,
                    //     from,
                    //     newOffset
                    // ),
                    ...groTokenContracts.map((groTokenContract) =>
                        loadStateful(
                            getNetwork(GN.ETHEREUM).id,
                            EV.Transfer,
                            groTokenContract,
                            from,
                            newOffset,
                        )),
                    ...groTokenContracts.map((groTokenContract) =>
                        loadStateful(
                            getNetwork(GN.ETHEREUM).id,
                            EV.Approval,
                            groTokenContract,
                            from,
                            newOffset,
                        )),
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

                const vaults = [
                    CN.AVAXDAIVault,
                    CN.AVAXUSDCVault,
                    CN.AVAXUSDTVault,
                    CN.AVAXDAIVault_v1_7,
                    CN.AVAXUSDCVault_v1_7,
                    CN.AVAXUSDTVault_v1_7,
                ];

                const oracles = [
                    CN.Chainlink_aggr_usdc,
                    CN.Chainlink_aggr_usdt,
                    CN.Chainlink_aggr_dai,
                ];

                result.push(
                    ...vaults.map((vault) =>
                        loadStateful(
                            getNetwork(GN.AVALANCHE).id,
                            EV.LogDeposit,
                            vault,
                            from,
                            newOffset,
                        )),
                    ...vaults.map((vault) =>
                        loadStateful(
                            getNetwork(GN.AVALANCHE).id,
                            EV.LogWithdrawal,
                            vault,
                            from,
                            newOffset,
                        )),
                    ...vaults.map((vault) =>
                        loadStateful(
                            getNetwork(GN.AVALANCHE).id,
                            EV.Approval,
                            vault,
                            from,
                            newOffset,
                        )),
                    ...vaults.map((vault) =>
                        loadStateful(
                            getNetwork(GN.AVALANCHE).id,
                            EV.Transfer,
                            vault,
                            from,
                            newOffset,
                        )),
                    ...vaults.map((vault) =>
                        loadStateful(
                            getNetwork(GN.AVALANCHE).id,
                            EV.LogStrategyReported,
                            vault,
                            from,
                            newOffset,
                        )),
                    ...[
                        CN.AVAXDAIVault_v1_7,
                        CN.AVAXUSDCVault_v1_7,
                        CN.AVAXUSDTVault_v1_7,
                    ].map((vault) =>
                        loadStateful(
                            getNetwork(GN.AVALANCHE).id,
                            EV.LogNewReleaseFactor,
                            vault,
                            from,
                            newOffset,
                        )),
                    ...oracles.map((oracle) =>
                        loadStateful(
                            getNetwork(GN.AVALANCHE).id,
                            EV.AnswerUpdated,
                            oracle,
                            from,
                            newOffset,
                        )),
                    loadStateful(
                        getNetwork(GN.AVALANCHE).id,
                        EV.LogClaim,
                        CN.AVAXBouncer,
                        from,
                        newOffset,
                    ),
                );
            }

            const res = await Promise.all(result);

            if (res.every(Boolean)) {
                showInfo(`Events from blocks <${from}> to <${newOffset}> for ${network} successfully processed`);
            } else {
                showError(
                    'etlStateful.ts->etlStatefulByBlock()',
                    'Error/s found during ETL for events'
                );
                return false;
            }

            return (newOffset >= to)
                ? true
                : etlStatefulByBlock(globalNetwork, newOffset, to, newOffset);

        } else {
            showError(
                'etlStateful.ts->etlStatefulByBlock()',
                `Blocks can't be processed (from: ${from} to: ${to})`
            );
            return false;
        }
    } catch (err) {
        showError('etlStateful.ts->etlStatefulByBlock()', err);
        return false;
    }
}

export {
    etlStatefulByDate,
    etlStatefulByBlock,
}
