const { getDefaultProvider } = require('./chainUtil');

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

async function getFilterEvents(filter, contractInterface, providerKey) {
    const provider = getDefaultProvider(providerKey);
    const filterLogs = await provider.getLogs(filter).catch((error) => {
        logger.error(error);
        return [];
    });

    const logs = [];
    filterLogs.forEach((log) => {
        const eventInfo = {
            address: log.address,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
        };
        const parseResult = contractInterface.parseLog(log);
        eventInfo.name = parseResult.name;
        eventInfo.signature = parseResult.signature;
        eventInfo.topic = parseResult.topic;
        eventInfo.args = parseResult.args;
        logs.push(eventInfo);
    });

    return logs;
}

async function getSimpleFilterEvents(filter, providerKey) {
    const provider = getDefaultProvider(providerKey);
    const filterLogs = await provider.getLogs(filter).catch((error) => {
        logger.error(error);
        return [];
    });

    const logs = [];
    filterLogs.forEach((log) => {
        const eventInfo = {
            address: log.address,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
        };
        logs.push(eventInfo);
    });

    return logs;
}

module.exports = {
    getFilterEvents,
    getSimpleFilterEvents,
};
