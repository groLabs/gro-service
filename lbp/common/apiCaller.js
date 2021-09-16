const axios = require('axios');
const { getConfig } = require('../../common/configUtil');
const { latestPriceAndBalance } = require('../subgraph/latestPriceAndBalance');
const { swaps } = require('../subgraph/swaps');

// Config
const balancerV2_graph_url = getConfig('lbp.balancerV2_graph_url');
const balancerV2_pool_id = getConfig('lbp.balancerV2_pool_id');


const callSubgraph = async (query, targetTimestamp) => {

    let q;
    switch (query) {
        case 'latestPriceAndBalance':
            q = latestPriceAndBalance(
                balancerV2_pool_id,
                targetTimestamp
            )
            break;
        case 'swaps':
            q = swaps(
                balancerV2_pool_id,
                targetTimestamp
            )
            break;
        default:
            //return error;
            break;
    }

    const result = await axios.post(
        balancerV2_graph_url,
        {
            query: q
        }
    );

    const res = result.data.data;
    // TODO: check if data OK

    return res;
}

module.exports = {
    callSubgraph,
}