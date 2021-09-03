const moment = require('moment');
// This code is for parse(), which already exists in personalStatsParser.js, but gives a token error if used from here.
const { getConfig } = require('../../common/configUtil');
const BN = require('bignumber.js');
const { div } = require('../../common/digitalUtil');
const amountDecimal = getConfig('blockchain.amount_decimal_place', false) || 7;
const ratioDecimal = getConfig('blockchain.ratio_decimal_place', false) || 4;


const parse = (amount, coin) => {
        return parseFloat(
            div(
                amount,
                coin === 'DAI' || coin === 'USD' ? BN(10).pow(18) : BN(10).pow(6),
                amountDecimal
            )
        );
    };

const getPrice = (stats) => {
    console.log('getPrice:', stats);
    const result = [
        moment.unix(stats.timestamp).utc(),
        stats.timestamp,
        stats.blockNumber,
        3, // getNetworkId(),
        parse(stats.price, 'USD'),
        moment().utc()
    ];
    return result;
}

const getTrades = (stats) => {
    console.log('getTrades', stats)
    const result = [
        moment.utc(),       //TODO: replace by date from blockNumber
        moment().unix(),    //TODO: replace by timestamp from blockNumber
        stats.blockNumber,
        3,                  //TODO: getNetworkId(),
        stats.transactionHash,
        stats.name,
        stats.caller,
        stats.tokenIn,
        parse(stats.tokenAmountIn, 'USD'),
        stats.tokenOut,
        parse(stats.tokenAmountOut, 'USD'),
        moment().utc(),
    ];
    return result;
}

module.exports = {
    getPrice,
    getTrades,
}
