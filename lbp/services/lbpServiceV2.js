const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { getConfig } = require('../../common/configUtil');
const { parseV2 } = require('../parser/lbpParserV2');
const { callSubgraph } = require('../common/apiCaller');
const {
    GRO_TICKER,
    USDC_TICKER,
} = require('../constants');

// Config
const LBP_START_TIMESTAMP = getConfig('lbp.lbp_start_date');
const LBP_END_TIMESTAMP = getConfig('lbp.lbp_end_date');
const LBP_START_GRO_WEIGHT = getConfig('lbp.lbp_gro_start_weight');
const LBP_END_WEIGHT = getConfig('lbp.lbp_gro_end_weight');
const lbp_usdc_start_balance = getConfig('lbp.usdc_amount_total');
const lbp_gro_start_balance = getConfig('lbp.gro_amount_total');


const calcWeight = (targetTimestamp) => {
    try {
        const duration = (LBP_END_TIMESTAMP - LBP_START_TIMESTAMP) / 3600;
        const hourly_rate = (LBP_END_WEIGHT - LBP_START_GRO_WEIGHT) / duration;
        const diff_hours = (targetTimestamp - LBP_START_TIMESTAMP) / 3600;
        const gro_weight = LBP_START_GRO_WEIGHT + (hourly_rate * diff_hours);
        const usdc_weight = 1 - gro_weight;

        return [gro_weight, usdc_weight];
    } catch (err) {
        logger.error(`**LBP: Error in lbpServiceV2.js->calcWeight(): ${err}`);
    }
}

// return USDC & GRO balances based on swap history. If no swaps, return initial balances
const calcBalance = async (targetTimestamp, stats) => {
    try {
        let unknown_token = [];

        // Initial balances
        let gro_balance = lbp_gro_start_balance;
        let usdc_balance = lbp_usdc_start_balance;

        // Calc balances based on swap history. If no swaps, subgraph will return an empty array
        for (const swap of stats) {
            if (swap.timestamp <= targetTimestamp) {
                const tokenInSym = swap.tokenInSym.toUpperCase();
                const tokenOutSym = swap.tokenOutSym.toUpperCase();
                if (tokenInSym === USDC_TICKER && tokenOutSym === GRO_TICKER) {
                    usdc_balance += parseFloat(swap.tokenAmountIn);
                    gro_balance -= parseFloat(swap.tokenAmountOut);
                } else if (tokenInSym === GRO_TICKER && tokenOutSym === USDC_TICKER) {
                    gro_balance += parseFloat(swap.tokenAmountIn);
                    usdc_balance -= parseFloat(swap.tokenAmountOut);
                } else {
                    if (tokenInSym !== GRO_TICKER && tokenInSym !== USDC_TICKER) {
                        if (!unknown_token.includes(tokenInSym))
                            unknown_token.push(tokenInSym);
                    } else if (tokenOutSym !== GRO_TICKER && tokenOutSym !== USDC_TICKER) {
                        if (!unknown_token.includes(tokenOutSym))
                            unknown_token.push(tokenOutSym);
                    }
                }
            }
        }
        if (unknown_token.length > 0) {
            logger.error(`**LBP: Unknown token/s in lbpServiceV2.js->calcBalance(): ${unknown_token}`);
        }
        return [gro_balance, usdc_balance];
    } catch (err) {
        logger.error(`**LBP: Error in lbpServiceV2.js->calcBalance(): ${err}`);
    }
}

const getPriceAndBalance = async (targetTimestamp, stats) => {
    try {
        // Get target weights
        const [
            gro_weight,
            usdc_weight,
        ] = calcWeight(targetTimestamp);

        // Get target balances
        let gro_balance;
        let usdc_balance;
        if (stats) {
            // HDL
            [gro_balance, usdc_balance] = await calcBalance(targetTimestamp, stats);
        } else {
            // Normal load
            const res = await callSubgraph('latestPriceAndBalance', null, null, null);
            if (res && res.poolTokens) {
                [gro_balance, usdc_balance] = parseV2(res);
                if (!gro_balance || !usdc_balance)
                    throw 'GRO & USDC balances not found';
            } else {
                throw 'Error during subgraph API call';
            }
        }

        // Calc spot price
        const spot_price = (usdc_balance / usdc_weight) / (gro_balance / gro_weight);

        return [spot_price, gro_balance];
    } catch (err) {
        logger.error(`**LBP: Error in lbpServiceV2.js->getPriceAndBalance(): ${err}`);
    }
}


const fetchLBPDataV2 = async (targetTimestamp, stats) => {
    try {
        // TODO 1: check if error is returned
        // sometimes: 2021-09-15T18:16:09.567Z error: **LBP: Error in lbpServiceV2.js->fetchLBPDataV2(): Error: Request failed with status code 502
        // TODO 2: check if data returned, all expected fields exist
        // TODO 3: check when targetTimestamp is before or after the LBP

        //const [price, balance] = await getPriceAndBalance(targetTimestamp, stats);
        const res = await getPriceAndBalance(targetTimestamp, stats);
        if (res) {
            const [price, balance] = res;
            return {
                price: {
                    timestamp: targetTimestamp,
                    blockNumber: 0,
                    price: price,
                },
                balance: {
                    timestamp: targetTimestamp,
                    blockNumber: 0,
                    balance: balance,
                },
            };
        } else {
            return {
                message: 'Error during price & balance calculation with Balancer subgraphs'
            }
        }



    } catch (err) {
        logger.error(`**LBP: Error in lbpServiceV2.js->fetchLBPDataV2(): ${err}`);
    }
}

module.exports = {
    fetchLBPDataV2,
};
