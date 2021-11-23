"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTimeStamp = exports.checkQueryResult = exports.checkLastTimestamp = void 0;
const queryHandler_1 = require("../handler/queryHandler");
const personalUtil_1 = require("./personalUtil");
const moment_1 = __importDefault(require("moment"));
const constants_1 = require("../constants");
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const checkLastTimestamp = async (source) => {
    return await (0, queryHandler_1.query)('select_last_protocol_load.sql', [source]);
};
exports.checkLastTimestamp = checkLastTimestamp;
const checkQueryResult = (result, table) => {
    try {
        if (result.status === constants_1.QUERY_ERROR) {
            return false;
        }
        else if (table !== 'PROTOCOL_VAULTS'
            && table !== 'PROTOCOL_RESERVES'
            && table !== 'PROTOCOL_STRATEGIES'
            && table !== 'PROTOCOL_EXPOSURE_STABLES'
            && table !== 'PROTOCOL_EXPOSURE_PROTOCOLS'
            && table !== 'PROTOCOL_PRICE_CHECK_DETAILED'
            && table !== 'PROTOCOL_SYSTEM_LIFEGUARD_STABLES') {
            logger.info(`**DB: ${result.rowCount} records added into ${table}`);
        }
        return true;
    }
    catch (err) {
        logger.error(`**DB: Error in protocolUtil.js->checkQueryResult(): ${err}`);
        return false;
    }
};
exports.checkQueryResult = checkQueryResult;
const updateTimeStamp = async (block_timestamp, source) => {
    try {
        const params = [
            block_timestamp,
            (0, moment_1.default)().utc(),
            (0, personalUtil_1.getNetworkId)(),
            source,
        ];
        const res = await (0, queryHandler_1.query)('update_last_protocol_load.sql', params);
        if (res.status === constants_1.QUERY_ERROR)
            logger.error(`**DB: Error in protocolUtil.js->updateTimeStamp(): Table SYS_PROTOCOL_LOADS not updated.`);
    }
    catch (err) {
        logger.error(`**DB: Error in protocolUtil.js->updateTimeStamp(): ${err}`);
    }
};
exports.updateTimeStamp = updateTimeStamp;
