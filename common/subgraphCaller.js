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
                payload.block
            );
            break;
        default:
            logger.error(`Error in subgraphCaller.js->callSubgraph(): Invalid subgraph request (${payload.query})`)
            return null;
    }

    const result = await axios.post(
        payload.url,
        { query: q }
    ).catch(err => {
        if (err.response) {
            // Request made and server responded
            logger.error(`Error in subgraphCaller.js->callSubgraph(): ${err.response.data}`);
        } else if (err.request) {
            // The request was made but no response was received
            logger.error(`Error in subgraphCaller.js->callSubgraph(): ${err.request}`);
        } else {
            // Something happened in setting up the request that triggered an Error
            logger.error(`Error in subgraphCaller.js->callSubgraph(): ${err.message}`);
        }
    });

    return (!result || result.data.errors) ? null : result.data.data;
}

module.exports = {
    callSubgraph,
}
