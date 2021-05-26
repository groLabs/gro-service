const axios = require('axios');

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

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

module.exports = {
    getPriceObject,
};
