import { query } from '../handler/queryHandler';
import { QUERY_ERROR } from '../constants';
import {
    showInfo,
    showError,
} from '../handler/logHandler';


const truncateTempAirdrop4 = async (): Promise<boolean> => {
    try {
        const q = 'truncate_airdrop4_temp.sql';
        const result = await query(q, []);
        return (result.status === QUERY_ERROR) ? false : true;
    } catch (err) {
        showError('loadAirdrop4.ts->truncateTempAirdrop4()', err);
        return false;
    }
}

const loadTempAirdrop4 = async (
    item,
    payload
): Promise<boolean> => {
    try {
        const q = 'insert_airdrop4_temp.sql';
        const result = await query(q, payload);
        if (result.status === QUERY_ERROR)
            return false;
        else {
            showInfo(`Item ${item} w/address ${payload[4]} loaded into AIRDROP4_TEMP`);
            return true;
        }
    } catch (err) {
        showError('loadAirdrop4.ts->loadTempAirdrop4()', err);
        return false;
    }
}

const loadAirdrop4 = async () => {
    try {
        const q = 'insert_airdrop4_final.sql';
        const result = await query(q, []);
        if (result.status === QUERY_ERROR)
            showError(
                'loadAirdrop4.ts->loadAirdrop4()',
                'error/s during the load into AIRDROP4_FINAL'
            );
        else {
            showInfo(`${result.rowCount} items loaded into AIRDROP4_FINAL`);
        }
    } catch (err) {
        showError('loadAirdrop4.ts->loadAirdrop4()', err);
    }
}

export {
    loadAirdrop4,
    loadTempAirdrop4,
    truncateTempAirdrop4,
}
