"use strict";
/// @notice GroStats loader
///     - Receives gro stats (JSON stucture) as parameter and loads all data into tables
///     - Loads are triggered every 5' by a cron
///     - Two public functions:
///         loadAllTables(): loads all groStats-related tables
///         loadAOY():  called on-demand and loads only APY data into tables (eg: if there
///                     is missing data and there's a need of backfilling it)
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkLastTimestamp = exports.loadAPY = exports.loadAllTables = void 0;
const queryHandler_1 = require("../handler/queryHandler");
const groStatsParser_1 = require("../parser/groStatsParser");
const protocolUtil_1 = require("../common/protocolUtil");
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const checkLastTimestamp = async () => {
    return await (0, queryHandler_1.query)('select_last_protocol_load.sql', ['GRO_STATS']);
};
exports.checkLastTimestamp = checkLastTimestamp;
const loadAPY = async (stats) => {
    try {
        const [pwrd, gvt] = await Promise.all([
            (0, queryHandler_1.query)('insert_protocol_apy.sql', (0, groStatsParser_1.getAPY)(stats, 'pwrd')),
            (0, queryHandler_1.query)('insert_protocol_apy.sql', (0, groStatsParser_1.getAPY)(stats, 'gvt'))
        ]);
        return ((0, protocolUtil_1.checkQueryResult)(pwrd, 'PROTOCOL_APY')
            && (0, protocolUtil_1.checkQueryResult)(gvt, 'PROTOCOL_APY'))
            ? true : false;
    }
    catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadAPY(): ${err}`);
        return false;
    }
};
exports.loadAPY = loadAPY;
const loadTVL = async (stats) => {
    try {
        const tvl = await (0, queryHandler_1.query)('insert_protocol_tvl.sql', (0, groStatsParser_1.getTVL)(stats));
        return ((0, protocolUtil_1.checkQueryResult)(tvl, 'PROTOCOL_TVL')) ? true : false;
    }
    catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadTVL(): ${err}`);
        return false;
    }
};
const loadLifeguard = async (stats) => {
    try {
        const lifeguard = await (0, queryHandler_1.query)('insert_protocol_lifeguard.sql', (0, groStatsParser_1.getLifeguard)(stats));
        return ((0, protocolUtil_1.checkQueryResult)(lifeguard, 'PROTOCOL_LIFEGUARD')) ? true : false;
    }
    catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadLifeguard(): ${err}`);
        return false;
    }
};
const loadLifeguardStables = async (stats) => {
    try {
        let rows = 0;
        for (const stable of (0, groStatsParser_1.getLifeguardStables)(stats)) {
            const stables = await (0, queryHandler_1.query)('insert_protocol_system_lifeguard_stables.sql', stable);
            if ((0, protocolUtil_1.checkQueryResult)(stables, 'PROTOCOL_SYSTEM_LIFEGUARD_STABLES')) {
                rows += stables.rowCount;
            }
            else {
                return false;
            }
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_SYSTEM_LIFEGUARD_STABLES'}`);
        return true;
    }
    catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadLifeguardStables(): ${err}`);
        return false;
    }
};
const loadSystem = async (stats) => {
    try {
        const system = await (0, queryHandler_1.query)('insert_protocol_system.sql', (0, groStatsParser_1.getSystem)(stats));
        return ((0, protocolUtil_1.checkQueryResult)(system, 'PROTOCOL_SYSTEM')) ? true : false;
    }
    catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadSystem(): ${err}`);
        return false;
    }
};
const loadVaults = async (stats) => {
    try {
        let rows = 0;
        for (const vault of (0, groStatsParser_1.getVaults)(stats)) {
            const vaults = await (0, queryHandler_1.query)('insert_protocol_vaults.sql', vault);
            if ((0, protocolUtil_1.checkQueryResult)(vaults, 'PROTOCOL_VAULTS')) {
                rows += vaults.rowCount;
            }
            else {
                return false;
            }
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_VAULTS'}`);
        return true;
    }
    catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadVaults(): ${err}`);
        return false;
    }
};
const loadReserves = async (stats) => {
    try {
        let rows = 0;
        for (const vault of (0, groStatsParser_1.getReserves)(stats)) {
            const vaults = await (0, queryHandler_1.query)('insert_protocol_reserves.sql', vault);
            if ((0, protocolUtil_1.checkQueryResult)(vaults, 'PROTOCOL_RESERVES')) {
                rows += vaults.rowCount;
            }
            else {
                return false;
            }
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_RESERVES'}`);
        return true;
    }
    catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadReserves(): ${err}`);
        return false;
    }
};
const loadStrategies = async (stats) => {
    try {
        let rows = 0;
        for (const strategy of (0, groStatsParser_1.getStrategies)(stats)) {
            const strategies = await (0, queryHandler_1.query)('insert_protocol_strategies.sql', strategy);
            if ((0, protocolUtil_1.checkQueryResult)(strategies, 'PROTOCOL_STRATEGIES')) {
                rows += strategies.rowCount;
            }
            else {
                return false;
            }
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_STRATEGIES'}`);
        return true;
    }
    catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadStrategies(): ${err}`);
        return false;
    }
};
const loadExposureStables = async (stats) => {
    try {
        let rows = 0;
        for (const stable of (0, groStatsParser_1.getExposureStables)(stats)) {
            const stables = await (0, queryHandler_1.query)('insert_protocol_exposure_stables.sql', stable);
            if ((0, protocolUtil_1.checkQueryResult)(stables, 'PROTOCOL_EXPOSURE_STABLES')) {
                rows += stables.rowCount;
            }
            else {
                return false;
            }
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_EXPOSURE_STABLES'}`);
        return true;
    }
    catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadExposureStables(): ${err}`);
        return false;
    }
};
const loadExposureProtocols = async (stats) => {
    try {
        let rows = 0;
        for (const stable of (0, groStatsParser_1.getExposureProtocols)(stats)) {
            const stables = await (0, queryHandler_1.query)('insert_protocol_exposure_protocols.sql', stable);
            if ((0, protocolUtil_1.checkQueryResult)(stables, 'PROTOCOL_EXPOSURE_PROTOCOLS')) {
                rows += stables.rowCount;
            }
            else {
                return false;
            }
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_EXPOSURE_PROTOCOLS'}`);
        return true;
    }
    catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadExposureProtocols(): ${err}`);
        return false;
    }
};
const loadAllTables = async (stats) => {
    try {
        if (stats.current_timestamp > 0) {
            const res = await Promise.all([
                loadAPY(stats),
                loadTVL(stats),
                loadSystem(stats),
                loadLifeguardStables(stats),
                loadVaults(stats),
                loadReserves(stats),
                loadLifeguard(stats),
                loadStrategies(stats),
                loadExposureStables(stats),
                loadExposureProtocols(stats),
            ]);
            if (res.every(Boolean)) {
                await (0, protocolUtil_1.updateTimeStamp)(stats.current_timestamp, 'GRO_STATS');
            }
            else {
                logger.warn(`**DB: Error/s found in loadGroStats.js->loadAllTables(): Table SYS_PROTOCOL_LOADS not updated.`);
            }
        }
        else {
            logger.error(`**DB: Error in loadGroStats.js->loadAllTables(): stats JSON structure is not correct.`);
        }
    }
    catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadAllTables(): ${err}`);
    }
};
exports.loadAllTables = loadAllTables;
