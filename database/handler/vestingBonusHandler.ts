import { query } from './queryHandler';
import {
    QUERY_ERROR,
    QUERY_SUCCESS
} from '../constants';
import { showError } from '../handler/logHandler';

const ERROR_RESPONSE = {
    "status": QUERY_ERROR.toString(),
    "address": '',
    "amount": '',
}

const getVestingBonus = async (address: string) => {
    try {
        const res = await query('select_fe_user_vesting_bonus.sql', [address]);
        if (res.status === QUERY_ERROR) {
            showError(
                'vestingBonusHandler.ts->getVestingBonus()',
                'Error while retrieving claims from USER_VESTING_BONUS'
            );
            return ERROR_RESPONSE;
        } else {
            const result = res.rows;
            if (result.length > 0) {
                return {
                    "status": QUERY_SUCCESS.toString(),
                    "address": result[0].address,
                    "amount": result[0].amount,
                }
            } else {
                return {
                    "status": QUERY_SUCCESS.toString(),
                    "address": address,
                    "amount": '0',
                }
            }
        }
    } catch (err) {
        showError('vestingBonusHandler.ts->getVestingBonus()', err);
        return ERROR_RESPONSE;
    }
}

export {
    getVestingBonus,
}