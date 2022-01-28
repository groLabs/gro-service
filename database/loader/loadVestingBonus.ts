
import { ICall } from '../interfaces/ICall';
import { query } from '../handler/queryHandler';
import { isPlural } from '../common/globalUtil';
import { getClaimEvents } from '../listener/getClaimEvents';
import { vestingBonusParser } from '../parser/vestingBonusParser';
import { 
    showInfo,
    showError
} from '../handler/logHandler';
import {
    QUERY_ERROR,
    QUERY_SUCCESS
} from '../constants';


const loadVestingBonus = async (lastBlock) => {
    try {
        const events = await getClaimEvents(
            lastBlock + 1,
            null,
        );

        if (events.status === QUERY_SUCCESS) {
            let rows = 0;

            // Parse all events
            const result: ICall = await vestingBonusParser(events.data);
            if (result.status === QUERY_SUCCESS) {

                // Convert params from object to array
                let params = [];
                for (const param of result.data)
                    params.push(Object.values(param));

                // Insert each claim into the DB
                for (const param of params) {
                    const res = await query('insert_user_vesting_bonus.sql', param);
                    if (res.status === QUERY_ERROR) {
                        showError(
                            'loadVestingBonus.ts->loadVestingBonus',
                            'Error while insterting claims into USER_VESTING_BONUS'
                        )
                        return;
                    }
                    rows += res.rowCount;
                }

                if (rows > 0)
                    showInfo(`${rows} bonus claim${isPlural(rows)} added into USER_VESTING_BONUS`);
            }
        }
    } catch (err) {
        showError('loadVestingBonus.ts->loadVestingBonus', err);
    }
}

export {
    loadVestingBonus,
}