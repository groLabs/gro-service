// TODO: error handler
// TODO: loggers
const moment = require('moment');
const { query } = require('../handler/queryHandler');
const {
    getNetworkId
} = require('../common/personalUtil');
const {
    getAPY,
    getHodlBonus,
    getTVL,
    getSystem,
    getVaults,
    getReserves,
    getLifeguard,
    getStrategies,
    getExposureStables,
    getExposureProtocols,
} = require('../common/groStatsParser');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const QUERY_ERROR = 400;


const checkLastTimestamp = async () => {
    return await query('select_last_protocol_load.sql', ['GRO_STATS']);
}

const checkQueryResult = (result, table) => {
    if (result.status === QUERY_ERROR) {
        throw `Query error with table ${table}`;
    } else if (table !== 'PROTOCOL_VAULTS'
        && table !== 'PROTOCOL_RESERVES'
        && table !== 'PROTOCOL_STRATEGIES'
        && table !== 'PROTOCOL_EXPOSURE_STABLES'
        && table !== 'PROTOCOL_EXPOSURE_PROTOCOLS') {
        logger.info(`**DB: ${result.rowCount} records added into ${table}`);
    }
}

const loadAPY = async (stats) => {
    try {
        const [
            pwrd,
            gvt
        ] = await Promise.all([
            query('insert_protocol_apy.sql', getAPY(stats, 'pwrd')),
            query('insert_protocol_apy.sql', getAPY(stats, 'gvt'))
        ]);
        checkQueryResult(pwrd, 'PROTOCOL_APY');
        checkQueryResult(gvt, 'PROTOCOL_APY');
        return true;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadAPY(): ${err}`);
        return false;
    }
}

const loadTVL = async (stats) => {
    try {
        const tvl = await query('insert_protocol_tvl.sql', getTVL(stats));
        checkQueryResult(tvl, 'PROTOCOL_TVL');
        return true;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadTVL(): ${err}`);
        return false;
    }
}

const loadLifeguard = async (stats) => {
    try {
        const lifeguard = await query('insert_protocol_lifeguard.sql', getLifeguard(stats));
        checkQueryResult(lifeguard, 'PROTOCOL_LIFEGUARD');
        return true;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadLifeguard(): ${err}`);
        return false;
    }
}

const loadSystem = async (stats) => {
    try {
        const system = await query('insert_protocol_system.sql', getSystem(stats));
        checkQueryResult(system, 'PROTOCOL_SYSTEM');
        return true;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadSystem(): ${err}`);
        return false;
    }
}

const loadVaults = async (stats) => {
    try {
        let rows = 0;
        for (const vault of getVaults(stats)) {
            const vaults = await query('insert_protocol_vaults.sql', vault);
            checkQueryResult(vaults, 'PROTOCOL_VAULTS');
            rows += vaults.rowCount;
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_VAULTS'}`);
        return true;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadVaults(): ${err}`);
        return false;
    }
}

const loadReserves = async (stats) => {
    try {
        let rows = 0;
        for (const vault of getReserves(stats)) {
            const vaults = await query('insert_protocol_reserves.sql', vault);
            checkQueryResult(vaults, 'PROTOCOL_RESERVES');
            rows += vaults.rowCount;
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_RESERVES'}`);
        return true;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadReserves(): ${err}`);
        return false;
    }
}

const loadStrategies = async (stats) => {
    try {
        let rows = 0;
        for (const strategy of getStrategies(stats)) {
            const strategies = await query('insert_protocol_strategies.sql', strategy);
            checkQueryResult(strategies, 'PROTOCOL_STRATEGIES');
            rows += strategies.rowCount;
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_STRATEGIES'}`);
        return true;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadStrategies(): ${err}`);
        return false;
    }
}

const loadExposureStables = async (stats) => {
    try {
        let rows = 0;
        for (const stable of getExposureStables(stats)) {
            const stables = await query('insert_protocol_exposure_stables.sql', stable);
            checkQueryResult(stables, 'PROTOCOL_EXPOSURE_STABLES');
            rows += stables.rowCount;
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_EXPOSURE_STABLES'}`);
        return true;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadExposureStables(): ${err}`);
        return false;
    }
}

const loadExposureProtocols = async (stats) => {
    try {
        let rows = 0;
        for (const stable of getExposureProtocols(stats)) {
            const stables = await query('insert_protocol_exposure_protocols.sql', stable);
            checkQueryResult(stables, 'PROTOCOL_EXPOSURE_PROTOCOLS');
            rows += stables.rowCount;
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_EXPOSURE_PROTOCOLS'}`);
        return true;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadExposureProtocols(): ${err}`);
        return false;
    }
}

const updateTimeStamp = async (stats) => {
    try {
        const params = [
            stats.current_timestamp,
            moment().utc(),
            getNetworkId(),
            'GRO_STATS',
        ];
        const res = await query('update_last_protocol_load.sql', params);
        if (res === QUERY_ERROR)
            throw `Query error in updateTimeStamp()`; //TODO
    } catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->updateTimeStamp(): ${err}`);
    }
}

const loadAllTables = async (stats) => {
    try {
        if (stats.current_timestamp > 0) {
            const res = await Promise.all([
                loadAPY(stats),
                loadTVL(stats),
                loadSystem(stats),
                loadVaults(stats),
                loadReserves(stats),
                loadLifeguard(stats),
                loadStrategies(stats),
                loadExposureStables(stats),
                loadExposureProtocols(stats),
            ]);
            if (res.every(Boolean)) {
                await updateTimeStamp(stats);
            } else {
                logger.warn(`**DB: Errors found in loadGroStats.js->Table SYS_PROTOCOL_LOAD not updated.`);
            }
        } else {
            logger.error(`**DB: Error in loadGroStats.js->loadAllTables(): stats JSON structure is not correct.`);
        }
    } catch (err) {
        logger.error(`**DB: Error in loadGroStats.js->loadAllTables(): ${err}`);
    }
}

module.exports = {
    loadAllTables,
    checkLastTimestamp,
}