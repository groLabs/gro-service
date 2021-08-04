const moment = require('moment');
const { query } = require('./queryHandler');
const botEnv = process.env.BOT_ENV.toLowerCase();
const nodeEnv = process.env.NODE_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { QUERY_ERROR } = require('../constants');
const { getConfig } = require('../../common/configUtil');
const launch_timestamp = getConfig('blockchain.start_timestamp');


const parseData = async (kpi, frequency, startDate, endDate) => {
    try {
        let q;
        const fromDate = moment.unix(startDate).format('MM/DD/YYYY');
        const toDate = moment.unix(endDate).format('MM/DD/YYYY');
        switch (frequency) {
            case 'twice_daily':
                q = 'select_fe_historical_apy_twice_daily.sql';
                break;
            case 'daily':
                q = 'select_fe_historical_apy_daily.sql';
                break;
            case 'weekly':
                q = 'select_fe_historical_apy_weekly.sql';
                break;
            default:
                return {};
        }
        const res = await query(q, [fromDate, toDate]);
        if (res.status !== QUERY_ERROR) {
            const apy = res.rows;
            let result = [];
            let gvt;
            let pwrd;
            for (let i = 0; i < apy.length; i++) {
                if (i > 0) {
                    if (apy[i].current_timestamp === apy[i - 1].current_timestamp) {
                        pwrd =
                            (apy[i].product_id === 1)
                                ? apy[i][kpi]
                                : apy[i - 1][kpi];
                        gvt =
                            (apy[i].product_id === 2)
                                ? apy[i][kpi]
                                : apy[i - 1][kpi];
                        result.push({
                            "gvt": parseFloat(gvt),
                            "date": apy[i].current_timestamp,
                            "pwrd": parseFloat(pwrd),
                        });
                    }
                }
            }
            return result;
        } else {
            return {}
        }
    } catch (err) {
        logger.error(`**DB: Error in historicalAPY.js->getDailyAPY(): ${err}`);
    }
}

/* parameters:
network=ropsten
attr=[apy_last7d,apy_last7d,apy_last7d]
freq=[twice_daily,daily,7day]
start=[1625057600,1625092600,1625097000]
end=[1629936000,1629936000,1629936000]


*/
const getHistoricalAPY = async (attr, freq, start, end) => {
    try {
        console.log('received:', attr, freq, start, end);

        const results = await Promise.all(
            attr.map((_, i) => parseData(attr[i], freq[i], start[i], end[i]))
        );

        let parsedResults = [];
        for (let i = 0; i < results.length; i++) {
            parsedResults.push({
                "key": `response${i + 1}`,
                "value": {
                    "attribute": attr[i],
                    "frequency": freq[i],
                    "start": start[i],
                    "end": end[i],
                    "results": results[i]
                }
            })
        }

        const object = parsedResults.reduce(
            (obj, item) => Object.assign(obj, { [item.key]: item.value }), {});

        const result = {
            "historical_stats": {
                "current_timestamp": moment().unix(),
                "launch_timestamp": launch_timestamp,
                "network": nodeEnv,
                ...object,
            }
        }
        
        return result;
    } catch (err) {
        logger.error(`**DB: Error in historicalAPY.js->getHistoricalAPY(): ${err}`);
    }
}

module.exports = {
    getHistoricalAPY,
}
