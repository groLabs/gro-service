import { QUERY_SUCCESS } from '../constants';
import { query } from '../handler/queryHandler';
import { getNetwork } from '../common/globalUtil';
import { loadVestingBonus } from '../loader/loadVestingBonus';
import {
    showInfo,
    showError,
} from '../handler/logHandler';
import {
    Bool,
    NetworkName,
    GlobalNetwork as GN
} from '../types';

const network = getNetwork(GN.ETHEREUM);
const HODLER_GENESIS_BLOCK = (network.name === NetworkName.MAINNET) ? 13405194 : 11220047;


const etlVestingBonus = async (etl : Bool) => {
    try {
        if (etl) {
            showInfo('Performing ETL for vesting bonus claims into USER_VESTING_BONUS...')
            await loadVestingBonus(HODLER_GENESIS_BLOCK);
        } else {
            const res = await query('select_max_block_vesting_bonus.sql', []);
            if (res.status === QUERY_SUCCESS) {
                const lastBlock = res.rows[0].last_block;
                if (lastBlock) {
                    await loadVestingBonus(lastBlock);
                } else {
                    showError(
                        'etlVestingBonus.ts->etlVestingBonus()',
                        'No data found in table USER_VESTING_BONUS'
                    );
                }
            } else {
                showError(
                    'etlVestingBonus.ts->etlVestingBonus()',
                    'Error while retrieving max block from table USER_VESTING_BONUS'
                );
            }
        }
    } catch (err) {
        showError('etlVestingBonus.ts->etlVestingBonus()', err);
    }
}

export {
    etlVestingBonus,
}
