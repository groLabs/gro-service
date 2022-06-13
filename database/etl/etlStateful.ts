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
import { etlStatefulEth } from './etlStatefulEth';
import { etlStatefulAvax } from './etlStatefulAvax';


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
/// @dev    (!) Event <LogNewReleaseFactor> is not applicable for Labs v1.0
/// @dev    (!) Event <LogHarvested> is not applicable for Strategies v1.0
/// @dev    (!) Event <LogMultiWithdraw> is not applicable for LpTokenStaker v1.0
/// @dev    (!) Event <LogMigrateUser> is not applicable for LPTokenStaker V1.0
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

            let result;

            if (globalNetwork === GN.ETHEREUM) {
                result = etlStatefulEth(
                    from,
                    newOffset
                );
            }

            if (globalNetwork === GN.AVALANCHE) {
                result = etlStatefulAvax(
                    from,
                    newOffset
                );
            }

            const res = await Promise.all(result);

            if (res.every(Boolean)) {
                showInfo(`Events from blocks <${from}> to <${newOffset}> for ${network} successfully processed ;)`);
            } else {
                showError(
                    'etlStateful.ts->etlStatefulByBlock()',
                    'Error/s found during ETL for events :('
                );
                return false;
            }

            return (newOffset >= to)
                ? true
                : etlStatefulByBlock(globalNetwork, newOffset, to, newOffset);

        } else {
            showError(
                'etlStateful.ts->etlStatefulByBlock()',
                `Blocks can't be processed (from: ${from} to: ${to}) :(`,
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
