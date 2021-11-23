const axios = require('axios');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { getConfig } = require('../../common/configUtil');
const { latestPriceAndBalance } = require('../subgraph/latestPriceAndBalance');
const { swaps } = require('../subgraph/swaps');
// Config
const balancerV2_graph_url = getConfig('lbp.balancerV2_graph_url');
const balancerV2_pool_id = getConfig('lbp.balancerV2_pool_id');
const callSubgraph = async (query, targetTimestamp, first, skip) => {
    let q;
    switch (query) {
        case 'latestPriceAndBalance':
            q = latestPriceAndBalance(balancerV2_pool_id);
            break;
        case 'swaps':
            q = swaps(balancerV2_pool_id, targetTimestamp, first, skip);
            break;
        default:
            logger.error(`**LBP: Error in apiCaller.js->callSubgraph(): Invalid subgraph request (${query})`);
            return null;
    }
    const result = await axios.post(balancerV2_graph_url, { query: q });
    if (result.data.errors) {
        for (const err of result.data.errors) {
            logger.error(`**LBP: Error in apiCaller.js->callSubgraph(): ${err.message}`);
        }
    }
    return result.data.data;
};
module.exports = {
    callSubgraph,
};
