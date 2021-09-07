const moment = require('moment');
const {
    LBP_CONTRACT,
    USDC_CONTRACT,
} = require('../constants');
// This code is for parse(), which already exists in personalStatsParser.js, but gives a token error if used from here.
const { getConfig } = require('../../common/configUtil');
const BN = require('bignumber.js');
const { div } = require('../../common/digitalUtil');
const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;
const ratioDecimal = getConfig('blockchain.ratio_decimal_place', false) || 4;

const {getNetworkId} = require('../common/lbpUtil');


const parse = (amount, type) => {
    return parseFloat(
        div(
            amount,
            (type === 'price') ? BN(10).pow(6) : BN(10).pow(18),
            (type === 'price') ? 6 : 7
        )
    );
}

const getData = (stats) => {
    const result = [
        moment.unix(stats.price.timestamp).utc(),
        stats.price.timestamp,
        stats.price.blockNumber,
        getNetworkId(),
        parse(stats.price.price, 'price'),
        parse(stats.balance.balance, 'balance'),
        moment().utc(),
    ];
    return result;
}

module.exports = {
    getData,
}
