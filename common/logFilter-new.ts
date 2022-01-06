import { stream } from '../lbp/lbpLogger';
import { getInfruraRpcProvider } from './chainUtil';
import { EventInfo, EventResult } from './commonTypes';

const botEnv = process.env.BOT_ENV?.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

async function getFilterEvents(filter, contractInterface, providerKey) {
    let status: string = '200';
    let message: string = undefined;
    const provider = getInfruraRpcProvider(providerKey);
    const filterLogs = await provider.getLogs(filter).catch((error) => {
        logger.error(error);
        status = '400';
        message = error.message;
        return [];
    });

    const logs: any = [];
    filterLogs.forEach((log) => {
        const eventInfo: EventInfo = {
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
    const events: EventResult = {
        status,
        message,
        data: logs,
    };
    return events;
}

async function getEvents(filter, contractInterface, provider) {
    let status: string = '200';
    let message: string = undefined;
    const filterLogs = await provider.getLogs(filter).catch((error) => {
        logger.error(error);
        status = '400';
        message = error.message;
        return [];
    });

    const logs = [];
    filterLogs.forEach((log) => {
        const eventInfo: EventInfo = {
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

    const events: EventResult = {
        status,
        message,
        data: logs,
    };
    return events;
}

async function getSimpleFilterEvents(filter, providerKey) {
    const provider = getInfruraRpcProvider(providerKey);
    const filterLogs = await provider.getLogs(filter).catch((error) => {
        logger.error(error);
        return [];
    });

    const logs: any = [];
    filterLogs.forEach((log) => {
        const eventInfo: EventInfo = {
            address: log.address,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
        };
        logs.push(eventInfo);
    });

    return logs;
}

export { getFilterEvents, getEvents, getSimpleFilterEvents };
