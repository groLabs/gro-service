const moment = require('moment');
const { getConfig } = require('../../common/configUtil');
const BN = require('bignumber.js');
const { div } = require('../../common/digitalUtil');
const { getNetworkId } = require('../common/lbpUtil');
const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;
const ratioDecimal = getConfig('blockchain.ratio_decimal_place', false) || 4;
const parse = (amount, type) => {
    return parseFloat(div(amount, (type === 'price') ? BN(10).pow(6) : BN(10).pow(18), (type === 'price') ? 6 : 7));
};
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
};
module.exports = {
    getData,
};
