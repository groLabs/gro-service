import moment from 'moment';
import { query } from '../handler/queryHandler';
import { getNetwork } from './globalUtil';
import { QUERY_ERROR } from '../constants';
import { GlobalNetwork } from '../types';
import {
    showInfo,
    showError,
} from '../handler/logHandler';


const checkLastTimestamp = async (source) => {
    return await query('select_last_protocol_load.sql', [source]);
}

const checkQueryResult = (
    result,
    table,
) => {
    try {
        if (result.status === QUERY_ERROR) {
            return false;
        } else if (
            table !== 'PROTOCOL_VAULTS'
            && table !== 'PROTOCOL_AVAX_VAULTS'
            && table !== 'PROTOCOL_RESERVES'
            && table !== 'PROTOCOL_AVAX_RESERVES'
            && table !== 'PROTOCOL_STRATEGIES'
            && table !== 'PROTOCOL_AVAX_STRATEGIES'
            && table !== 'PROTOCOL_EXPOSURE_STABLES'
            && table !== 'PROTOCOL_EXPOSURE_PROTOCOLS'
            && table !== 'PROTOCOL_PRICE_CHECK_DETAILED'
            && table !== 'PROTOCOL_SYSTEM_LIFEGUARD_STABLES'
        ) {
            showInfo(`${result.rowCount} records added into ${table}`);
        }
        return true;
    } catch (err) {
        showError('protocolUtil.ts->checkQueryResult()', err);
        return false;
    }
}

const updateTimeStamp = async (
    block_timestamp,
    source
) => {
    try {
        const params = [
            block_timestamp,
            moment().utc(),
            getNetwork(GlobalNetwork.ETHEREUM).id,
            source,
        ];
        const res = await query('update_last_protocol_load.sql', params);
        if (res.status === QUERY_ERROR)
            showError(
                'protocolUtil.ts->updateTimeStamp()',
                'Table SYS_PROTOCOL_LOADS not updated'
            );
    } catch (err) {
        showError('protocolUtil.ts->updateTimeStamp()', err);
    }
}

export {
    checkLastTimestamp,
    checkQueryResult,
    updateTimeStamp,
}
