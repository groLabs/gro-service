import { query } from './queryHandler';
import { QUERY_ERROR } from '../constants';
import { showError } from '../handler/logHandler';


const getPriceCheckGlobal = async () => {
    try {
        const res = await query(`select_all_protocol_pricecheck_global.sql`, []);
        if (res.status !== QUERY_ERROR) {
            const global = res.rows[0];
            return {
                "block_number": global.block_number,
                "block_timestamp": global.block_timestamp,
                "block_date": global.block_date,
                "safety_check_bound": parseFloat(global.safety_check_bound),
                "safety_check": global.safety_check,
                "oracle_check_tolerance": parseFloat(global.oracle_check_tolerance),
                "curve_check_tolerance": parseFloat(global.curve_check_tolerance),
            }
        } else {
            return {};
        }
    } catch (err) {
        showError('priceCheckHandler.ts->getPriceCheckGlobal()', err);
    }
}

const getPriceCheckDetail = async () => {
    try {
        let result = [];
        const res = await query(`select_all_protocol_pricecheck_detailed.sql`, []);
        if (res.status !== QUERY_ERROR) {
            const details = res.rows;
            for (const detail of details) {
                result.push({
                    "block_number": parseFloat(detail.block_number),
                    "block_timestamp": parseFloat(detail.block_timestamp),
                    "pair": detail.pair_name,
                    "curve_price": parseFloat(detail.curve_price),
                    "curve_cache_price": parseFloat(detail.curve_cache_price),
                    "curve_cache_diff": parseFloat(detail.curve_cache_diff),
                    "curve_cache_check": detail.curve_cache_check,
                    "chainlink_price": parseFloat(detail.chainlink_price),
                    "curve_chainlink_diff": parseFloat(detail.curve_chainlink_diff),
                    "curve_chainlink_check": detail.curve_chainlink_check,
                });
            }
        } else {
            return {};
        }
        return result;
    } catch (err) {
        showError('priceCheckHandler.ts->getPriceCheckDetail()', err);
    }
}

const getPriceCheck = async () => {
    try {
        return {
            "global": await getPriceCheckGlobal(),
            "detail": await getPriceCheckDetail(),
        }
    } catch (err) {
        showError('priceCheckHandler.ts->getPriceCheck()', err);
    }
}

export {
    getPriceCheck,
}
