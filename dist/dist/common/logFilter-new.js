"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSimpleFilterEvents = exports.getEvents = exports.getFilterEvents = void 0;
const chainUtil_1 = require("./chainUtil");
const botEnv = (_a = process.env.BOT_ENV) === null || _a === void 0 ? void 0 : _a.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
async function getFilterEvents(filter, contractInterface, providerKey) {
    const provider = (0, chainUtil_1.getInfruraRpcProvider)(providerKey);
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
exports.getFilterEvents = getFilterEvents;
async function getEvents(filter, contractInterface, provider) {
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
exports.getEvents = getEvents;
async function getSimpleFilterEvents(filter, providerKey) {
    const provider = (0, chainUtil_1.getInfruraRpcProvider)(providerKey);
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
exports.getSimpleFilterEvents = getSimpleFilterEvents;
