"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAirdrop4 = exports.loadTempAirdrop4 = exports.truncateTempAirdrop4 = void 0;
const queryHandler_1 = require("../handler/queryHandler");
const personalUtil_1 = require("../common/personalUtil");
const constants_1 = require("../constants");
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const truncateTempAirdrop4 = async () => {
    try {
        const q = 'truncate_airdrop4_temp.sql';
        const result = await (0, queryHandler_1.query)(q, []);
        return (result.status === constants_1.QUERY_ERROR) ? false : true;
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`loadAirdrop4->truncateTempAirdrop4()`, err);
        return false;
    }
};
exports.truncateTempAirdrop4 = truncateTempAirdrop4;
const loadTempAirdrop4 = async (item, payload) => {
    try {
        const q = 'insert_airdrop4_temp.sql';
        const result = await (0, queryHandler_1.query)(q, payload);
        if (result.status === constants_1.QUERY_ERROR)
            return false;
        else {
            logger.info(`Item ${item} w/address ${payload[4]} loaded into AIRDROP4_TEMP`);
            return true;
        }
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`loadAirdrop4->loadTempAirdrop4()`, err);
        return false;
    }
};
exports.loadTempAirdrop4 = loadTempAirdrop4;
const loadAirdrop4 = async () => {
    try {
        const q = 'insert_airdrop4_final.sql';
        const result = await (0, queryHandler_1.query)(q, []);
        if (result.status === constants_1.QUERY_ERROR)
            // @ts-ignore
            (0, personalUtil_1.handleErr)(`loadAirdrop4->loadAirdrop4(): error/s during the load into AIRDROP4_FINAL`);
        else {
            logger.info(`${result.rowCount} items loaded into AIRDROP4_FINAL`);
        }
    }
    catch (err) {
        (0, personalUtil_1.handleErr)(`loadAirdrop4->loadAirdrop4()`, err);
    }
};
exports.loadAirdrop4 = loadAirdrop4;
