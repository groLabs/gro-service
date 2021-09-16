const axios = require('axios');
const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { getConfig } = require('../../common/configUtil');
const { parseV2 } = require('../parser/lbpParserV2');
const { callSubgraph } = require('../common/apiCaller');

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
        console.log(err);
        // TODO: return error
    }
}

const calcBalance = async (stats, targetTimestamp) => {
    try {
        let gro_balance = lbp_gro_start_balance;
        let usdc_balance = lbp_usdc_start_balance;

        // check if data OK?
        for (const swap of stats.swaps) {
            if (swap.timestamp <= targetTimestamp) {
                if (swap.tokenInSym.toUpperCase() === 'USDC' && swap.tokenOutSym.toUpperCase() === 'GRO') {
                    usdc_balance += parseFloat(swap.tokenAmountIn);
                    gro_balance -= parseFloat(swap.tokenAmountOut);
                } else if (swap.tokenInSym.toUpperCase() === 'GRO' && swap.tokenOutSym.toUpperCase() === 'USDC') {
                    gro_balance += parseFloat(swap.tokenAmountIn);
                    usdc_balance -= parseFloat(swap.tokenAmountOut);
                } else {
                    // logger.error
                }
            }
        }
        return [gro_balance, usdc_balance];
    } catch (err) {
        console.log(err);
        // return error;
    }
}

const getHistoricPriceAndBalance = () => {
    try {

    } catch (err) {
        console.log(err);
    }
}

const getCurrentPriceAndBalance = async (targetTimestamp) => {
    try {
        // Get current weights
        const [
            gro_weight,
            usdc_weight,
        ] = calcWeight(targetTimestamp);

        // Get latest balances
        const res = await callSubgraph('latestPriceAndBalance', targetTimestamp);         // TODO: check if res is OK
        const [
            gro_balance,
            usdc_balance,
        ] = parseV2(res);

        // Calc spot price
        const spot_price = (usdc_balance / usdc_weight) / (gro_balance / gro_weight);

        return [spot_price, gro_balance];
    } catch (err) {
        console.log(err);
    }
}


const fetchLBPDataV2 = async (targetTimestamp) => {
    try {
        // TODO 1: check if error is returned
        // sometimes: 2021-09-15T18:16:09.567Z error: **DB: Error in lbpServiceV2.js->fetchLBPDataV2(): Error: Request failed with status code 502
        // TODO 2: check if data returned, all expected fields exist
        // TODO 3: check when targetTimestamp is before or after the LBP

        const [price, balance] = await getCurrentPriceAndBalance(targetTimestamp)

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
    } catch (err) {
        logger.error(`**DB: Error in lbpServiceV2.js->fetchLBPDataV2(): ${err}`);
    }
}

module.exports = {
    fetchLBPDataV2,
};
