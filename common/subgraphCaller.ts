import axios from 'axios';
import { getConfig } from './configUtil';
import { uniswapVolume } from '../stats/subgraph/uniswapVolume';
import { balancerVolume } from '../stats/subgraph/balancerVolume';

const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../${botEnv}/${botEnv}Logger`);


const callSubgraph = async (payload: { query: any; id: any; block?: any; addr?: any; url: string; }): Promise<null | any> => {
    let q: string;

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

export {
    callSubgraph,
}
