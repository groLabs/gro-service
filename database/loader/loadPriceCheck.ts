import { query } from '../handler/queryHandler';
import { getPriceGlobal, getPriceDetail } from '../parser/priceCheckParser';
import { checkQueryResult, updateTimeStamp } from '../common/protocolUtil';
import {
    showInfo,
    showError,
    showWarning,
} from '../handler/logHandler';


const loadPriceGlobal = async (prices): Promise<boolean> => {
    try {
        const price = await query('insert_protocol_price_check_global.sql', getPriceGlobal(prices));
        if (checkQueryResult(price, 'PROTOCOL_PRICE_CHECK_GLOBAL')) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        showError('loadPriceCheck.ts->loadPriceGlobal()', err);
        return false;
    }
}

const loadPriceDetail = async (prices, pairs): Promise<boolean> => {
    try {
        let rows = 0;
        for (const pair of pairs) {
            const price = await query('insert_protocol_price_check_detail.sql', getPriceDetail(prices, pair));
            if (checkQueryResult(price, 'PROTOCOL_PRICE_CHECK_DETAILED')) {
                rows += price.rowCount;
            } else {
                return false;
            }
        }
        showInfo(`${rows} records added into ${'PROTOCOL_PRICE_CHECK_DETAILED'}`);
        return true;
    } catch (err) {
        showError('loadPriceCheck.ts->loadPriceDetail()', err);
        return false;
    }
}

const loadAllTables = async (prices, isHDL) => {
    try {
        if (prices.block_number) {
            const pairs = ['dai_usdc', 'dai_usdt', 'usdt_usdc'];
            const res = await Promise.all([
                loadPriceDetail(prices, pairs),
                loadPriceGlobal(prices),
            ]);
            if (res.every(Boolean)) {
                if (!isHDL)
                    await updateTimeStamp(prices.current_timestamp, 'PRICE_CHECK');
            } else {
                if (!isHDL)
                    showWarning(
                        'loadPriceCheck.ts->loadAllTables()',
                        'Table SYS_PROTOCOL_LOADS not updated'
                    );
            }
        } else {
            showError(
                'loadPriceCheck.ts->loadAllTables()',
                'Block number not found in API call'
            );
        }
    } catch (err) {
        showError('loadPriceCheck.ts->loadAllTables()', err);
    }
}

export {
    loadAllTables,
}
