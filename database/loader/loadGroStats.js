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
const QUERY_ERROR = 400;


const checkLastTimestamp = async () => {
    const lastTimestamp = await query('select_last_protocol_load.sql', []);
    if (lastTimestamp === QUERY_ERROR) {
        throw `Query error in checkLastTimestamp()`; //TODO
    } else {
        return lastTimestamp.rows[0].last_timestamp;
    }
}

const checkQueryResult = (result, table) => {
    if (result === QUERY_ERROR) {
        throw `Query error with table ${table}`;
    } else if (table !== 'PROTOCOL_VAULTS'
        && table !== 'PROTOCOL_RESERVES'
        && table !== 'PROTOCOL_STRATEGIES'
        && table !== 'PROTOCOL_EXPOSURE_STABLES'
        && table !== 'PROTOCOL_EXPOSURE_PROTOCOLS') {
        console.log(`${result.rowCount} records added into ${table}`);
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
        console.log(err); //TODO
        return false;
    }
}

const loadTVL = async (stats) => {
    try {
        const tvl = await query('insert_protocol_tvl.sql', getTVL(stats));
        checkQueryResult(tvl, 'PROTOCOL_TVL');
        return true;
    } catch (err) {
        console.log(err); //TODO
        return false;
    }
}

const loadLifeguard = async (stats) => {
    try {
        const lifeguard = await query('insert_protocol_lifeguard.sql', getLifeguard(stats));
        checkQueryResult(lifeguard, 'PROTOCOL_LIFEGUARD');
        return true;
    } catch (err) {
        console.log(err); //TODO
        return false;
    }
}

const loadSystem = async (stats) => {
    try {
        const system = await query('insert_protocol_system.sql', getSystem(stats));
        checkQueryResult(system, 'PROTOCOL_SYSTEM');
        return true;
    } catch (err) {
        console.log(err); //TODO
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
        console.log(`${rows} records added into ${'PROTOCOL_VAULTS'}`);
        return true;
    } catch (err) {
        console.log(err); //TODO
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
        console.log(`${rows} records added into ${'PROTOCOL_RESERVES'}`);
        return true;
    } catch (err) {
        console.log(err); //TODO
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
        console.log(`${rows} records added into ${'PROTOCOL_STRATEGIES'}`);
        return true;
    } catch (err) {
        console.log(err); //TODO
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
        console.log(`${rows} records added into ${'PROTOCOL_EXPOSURE_STABLES'}`);
        return true;
    } catch (err) {
        console.log(err); //TODO
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
        console.log(`${rows} records added into ${'PROTOCOL_EXPOSURE_PROTOCOLS'}`);
        return true;
    } catch (err) {
        console.log(err); //TODO
        return false;
    }
}

const updateTimeStamp = async (stats) => {
    try {
        const params = [
            stats.launch_timestamp,
            moment().utc(),
            getNetworkId(),
        ];
        const res = await query('update_last_protocol_load.sql', params);
        if (res === QUERY_ERROR)
            throw `Query error in updateTimeStamp()`; //TODO
    } catch (err) {
        console.log(err); //TODO
    }
}

const loadAllTables = async (stats) => {
    try {
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
            console.log('wanrning loadAllTables'); //TODO: logger
        }
    } catch (err) {
        console.log(err); //TODO
    }

}

module.exports = {
    loadAllTables,
    checkLastTimestamp,
}