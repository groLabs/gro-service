const axios = require('axios');
const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { getConfig } = require('../../common/configUtil');
const { latestPriceAndBalance } = require('../subgraph/select_lbp_latest_price_and_balance');
const { parseData} = require('../parser/lbpParserV2');

// Config
const balancerv2_url = getConfig('lbp.balancerv2_url');
const LBP_START_TIMESTAMP = getConfig('lbp.lbp_start_date');
const LBP_END_TIMESTAMP = getConfig('lbp.lbp_end_date');


const calcSpotPrice = (stats) => {
    //TODO: check if we have all values; otherwise, get the initial params
    const [
        GRO_SUPPLY,
        USDC_SUPPLY,
        GRO_WEIGHT,
        GRO_SWAP_TIMESTAMP,
    ] = parseData(stats);
    const DURATION = (LBP_END_TIMESTAMP - GRO_SWAP_TIMESTAMP) / 3600;
    const FINAL_WEIGHT = 0.5;   //TODO: constant? from config?
    // const SWAP_FEE = 0.0175;    //TODO: constant? from config?
    const HOURLY_RATE = (FINAL_WEIGHT - GRO_WEIGHT) / DURATION;
    const NOW = moment().unix();
    const DIFF_HOURS = (NOW - GRO_SWAP_TIMESTAMP) / 3600;
    const NEW_GRO_WEIGHT = GRO_WEIGHT + (HOURLY_RATE * DIFF_HOURS);
    const NEW_USDC_WEIGHT = 1 - NEW_GRO_WEIGHT;
    const price_spot = (USDC_SUPPLY / NEW_USDC_WEIGHT) / (GRO_SUPPLY / NEW_GRO_WEIGHT); // + SWAP_FEE;

    console.log(GRO_SUPPLY, USDC_SUPPLY, GRO_WEIGHT, /*USDC_WEIGHT, GRO_PRICE,*/ LBP_START_TIMESTAMP, LBP_END_TIMESTAMP, GRO_SWAP_TIMESTAMP, DURATION, HOURLY_RATE);
    console.log(DIFF_HOURS, NEW_GRO_WEIGHT, NEW_USDC_WEIGHT, price_spot);

    return price_spot;
}




const fetchLBPDataV2 = async () => {
    try {
        // const result = await axios.post(
        //     balancerv2_url,
        //     {
        //         query: latestPriceAndBalance(
        //             '0x34e7677c19d527519eb336d3860f612b9ca107ab00020000000000000000017d')
        //     }

        // );
        //TODO: check if error is returned
        //sometimes: 2021-09-15T18:16:09.567Z error: **DB: Error in lbpServiceV2.js->fetchLBPDataV2(): Error: Request failed with status code 502


        //const res = result.data.data;
        const res = {
            poolTokens: [
              {
                balance: '4990.196180843153595',
                name: 'Gro DAO Token',
                priceRate: '1',
                symbol: 'GRO',
                weight: '0.857138235137981516'
              },
              {
                balance: '2026.035098',
                name: 'USDC',
                priceRate: '1',
                symbol: 'USDC',
                weight: '0.142877024064681472'
              }
            ],
            tokenPrices: [ { block: '27201932', price: '2.45326375', timestamp: 1631696764 } ]
          }
        console.log(res);

        calcSpotPrice(res);

        const finalResult = {
            "price": {
                "timestamp": 1,
                "blockNumber": 1,
                "price": 1
            },
            "balance": {
                "timestamp": 1,
                "blockNumber": 1,
                "balance": 1
            }

        }
        return finalResult;
    } catch (err) {
        logger.error(`**DB: Error in lbpServiceV2.js->fetchLBPDataV2(): ${err}`);
    }
}

module.exports = {
    fetchLBPDataV2,
};

/*
stats {
  price: { timestamp: 1631698153, blockNumber: 9296200, price: '444454' },
  balance: {
    timestamp: 1631698153,
    blockNumber: 9296200,
    balance: '4999996312554931540000000'
  }
}
*/