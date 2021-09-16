const moment = require('moment');
const { getNetworkId } = require('../common/lbpUtil');

const parseV2 = (stats) => {
    try {
        let gro_balance;
        let usdc_balance;
    
        for (const pool of stats.poolTokens) {
            if (pool.symbol === 'GRO') {
                gro_balance = pool.balance;
            } else if (pool.symbol === 'USDC') {
                usdc_balance = pool.balance;
            }
        }

        return [
            // moment.unix(stats.price.timestamp).utc(),
            // stats.price.timestamp,
            // stats.price.blockNumber,
            // getNetworkId(),
            parseFloat(gro_balance),
            parseFloat(usdc_balance),
            // moment().utc(),
        ];
    } catch(err) {
        console.log(err);
    }
}

// TODO: get exceptions !!!!!
const getDataV2 = (stats) => {
    return [
        moment.unix(stats.price.timestamp).utc(),
        stats.price.timestamp,
        stats.price.blockNumber,
        getNetworkId(),
        parseFloat(stats.price.price),
        parseFloat(stats.balance.balance),
        moment().utc(),
    ];

}

module.exports = {
    parseV2,
    getDataV2,
}
