import { stream } from '../lbp/lbpLogger';
import { getInfuraRpcProvider } from './chainUtil';
import { EventInfo, EventResult } from './commonTypes';

const botEnv = process.env.BOT_ENV?.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);

async function getFilterEvents(
    filter,
    contractInterface,
    providerKey
): Promise<EventResult> {
    const events: EventResult = {
        status: 200,
        data: [],
    };
    try {
        const provider = getInfuraRpcProvider(providerKey);
        const filterLogs = await provider.getLogs(filter);

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
        events.data = logs;
    } catch (error) {
        events.status = 400;
        events.data = error.message;
    }
    return events;
}

async function getEvents(
    filter,
    contractInterface,
    provider
): Promise<EventResult> {
    const events: EventResult = {
        status: 200,
        data: [],
    };
    try {
        const filterLogs = await provider.getLogs(filter);

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
        events.data = logs;
    } catch (error) {
        events.status = 400;
        events.data = error.message;
    }
    return events;
}

async function getSimpleFilterEvents(filter, providerKey) {
    const provider = getInfuraRpcProvider(providerKey);
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
