//@ts-nocheck
import axios from 'axios';

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
import { getConfig } from '../common/configUtil';

const priceObject = {};

async function updatePriceObject() {
    const res = await axios
        .get('https://www.gasnow.org/api/v3/gas/price')
        .catch((error) => {
            logger.error(error);
            return { data: {} };
        });
    if (res.data.code === 200) {
        priceObject.data = res.data.data;
        priceObject.updateTimes = Date.now();
        logger.info(`Update priceObject to : ${JSON.stringify(priceObject)}`);
    } else {
        priceObject.data = {};
        logger.error('Update priceObject failed.');
    }
}

async function getPriceObject() {
    if (!priceObject.data) {
        await updatePriceObject();
    } else if (Date.now() - priceObject.updateTimes > 16000) {
        // 15s, need update gas price
        await updatePriceObject();
    }
    return priceObject.data;
}

async function getAlchemyPriorityPrice() {
    const apiKey = getConfig('blockchain.alchemy_api_keys.default');
    const body = {
        jsonrpc: '2.0',
        method: 'eth_maxPriorityFeePerGas',
        params: [],
        id: 1,
    };

    const response = await axios({
        method: 'post',
        url: `https://eth-mainnet.alchemyapi.io/v2/${apiKey}`,
        data: body,
    }).catch((error) => {
        logger.error(error);
    });
    return response.data.result;
}

async function getAlchemy24HoursLowestFee() {
    const apiKey = getConfig('blockchain.alchemy_api_keys.default');
    let endBlock = 'latest';
    let lowestBaseFeePerGas = 90000000000;
    for (let i = 0; i < 7; i += 1) {
        const body = {
            jsonrpc: '2.0',
            method: 'eth_feeHistory',
            params: [1024, endBlock, []],
            id: 1,
        };

        // eslint-disable-next-line no-await-in-loop
        const response = await axios({
            method: 'post',
            url: `https://eth-mainnet.alchemyapi.io/v2/${apiKey}`,
            data: body,
        }).catch((error) => {
            logger.error(error);
        });
        const historyFees = response.data.result.baseFeePerGas;
        for (let j = 0; j < historyFees.length; j += 1) {
            const fee = parseInt(historyFees[j], 16);
            if (fee < lowestBaseFeePerGas) {
                lowestBaseFeePerGas = fee;
            }
        }
        endBlock = response.data.result.oldestBlock;
    }
    logger.info(
        `historical base fee start from block ${parseInt(
            endBlock,
            16
        )} lowestBaseFeePerGas ${lowestBaseFeePerGas}`
    );
    return lowestBaseFeePerGas;
}

export {
    getPriceObject,
    getAlchemyPriorityPrice,
    getAlchemy24HoursLowestFee,
};
