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

const Side = Object.freeze({
    SWAP_IN: 1,
    SWAP_OUT: 2,
});

const parse = (amount, coin) => {
    return parseFloat(
        div(
            amount,
            (coin === 'LBP') ? BN(10).pow(18) : BN(10).pow(6),
            amountDecimal
        )
    );
}

const checkSide = (token_addr_out) => {
    return (token_addr_out === USDC_CONTRACT)
        ? Side.SWAP_IN
        : Side.SWAP_OUT
}

const getPrice = (stats) => {
    const result = [
        moment.unix(stats.timestamp).utc(),
        stats.timestamp,
        stats.blockNumber,
        3, // getNetworkId(),
        parse(stats.price, 'LBP'),
        moment().utc()
    ];
    return result;
}

const getTrades = (stats) => {
    const side = checkSide(stats.tokenOut);
    const result = [
        moment.unix(stats.timestamp).utc(),
        stats.timestamp,
        stats.blockNumber,
        3,                  //TODO: getNetworkId(),
        stats.transactionHash,
        (side === Side.SWAP_IN)
            ? 'SWAP_IN'     // USDC comming in from user
            : 'SWAP_OUT',   // GRO coming out to user
        stats.caller,
        stats.tokenIn,
        stats.tokenAmountIn,
        stats.tokenOut,
        stats.tokenAmountOut,
        (side === Side.SWAP_IN)
            ? parse(stats.tokenAmountOut, 'USD')
            : parse(stats.tokenAmountOut, 'LBP'),
        moment().utc(),
    ];
    return result;
}

module.exports = {
    getPrice,
    getTrades,
}
