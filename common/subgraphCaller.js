const axios = require('axios');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../${botEnv}/${botEnv}Logger`);
const { getConfig } = require('./configUtil');
const { uniswapVolume } = require('../stats/subgraph/uniswapVolume');
const { balancerVolume } = require('../stats/subgraph/balancerVolume');


const callSubgraph = async (payload) => {
    let q;

    switch (payload.query) {
        case 'uniswapVolume':
            q = uniswapVolume(
                payload.id,
                payload.block,
            );
            break;
        case 'balancerVolume':
            q = balancerVolume(
                payload.id,
                payload.addr,
            );
            break;
        default:
            logger.error(`Error in subgraphCaller.js->callSubgraph(): Invalid subgraph request (${payload.query})`)
            return null;
    }

    const result = await axios.post(
        payload.url,
        { query: q }
    )

    if (result.data.errors) {
        for (const err of result.data.errors) {
            logger.error(`Error in subgraphCaller.js->callSubgraph(): ${err.message}`);
        }
    }

    return result.data.data;
}

module.exports = {
    callSubgraph,
}
