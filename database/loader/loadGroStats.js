// TODO: error handler
const { query } = require('../handler/queryHandler');
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

const checkQueryResult = (result, table) => {
    if (result === 400) {
        throw `Query error with table ${table}`;
    } else if (table !== 'PROTOCOL_VAULTS'
        && table !== 'PROTOCOL_RESERVES'
        && table !== 'PROTOCOL_STRATEGIES'
        && table !== 'PROTOCOL_EXPOSURE_STABLES'
        && table !== 'PROTOCOL_EXPOSURE_PROTOCOLS') {
        console.log(`${result.rowCount} records added into ${table}`);
    }
}

const loadAPY = async () => {
    try {
        const [
            pwrd,
            gvt
        ] = await Promise.all([
            query('insert_protocol_apy.sql', getAPY('pwrd')),
            query('insert_protocol_apy.sql', getAPY('gvt'))
        ]);
        checkQueryResult(pwrd, 'PROTOCOL_APY');
        checkQueryResult(gvt, 'PROTOCOL_APY');
    } catch (err) {
        console.log(err);
    }
}

const loadTVL = async () => {
    try {
        const tvl = await query('insert_protocol_tvl.sql', getTVL());
        checkQueryResult(tvl, 'PROTOCOL_TVL');
    } catch (err) {
        console.log(err);
    }
}

const loadLifeguard = async () => {
    try {
        const lifeguard = await query('insert_protocol_lifeguard.sql', getLifeguard());
        checkQueryResult(lifeguard, 'PROTOCOL_LIFEGUARD');
    } catch (err) {
        console.log(err);
    }
}

const loadSystem = async () => {
    try {
        const system = await query('insert_protocol_system.sql', getSystem());
        checkQueryResult(system, 'PROTOCOL_SYSTEM');
    } catch (err) {
        console.log(err);
    }
}

const loadVaults = async () => {
    try {
        let rows = 0;
        for (const vault of getVaults()) {
            const vaults = await query('insert_protocol_vaults.sql', vault);
            checkQueryResult(vaults, 'PROTOCOL_VAULTS');
            rows += vaults.rowCount;
        }
        console.log(`${rows} records added into ${'PROTOCOL_VAULTS'}`);
    } catch (err) {
        console.log(err);
    }
}

const loadReserves = async () => {
    try {
        let rows = 0;
        for (const vault of getReserves()) {
            const vaults = await query('insert_protocol_reserves.sql', vault);
            checkQueryResult(vaults, 'PROTOCOL_RESERVES');
            rows += vaults.rowCount;
        }
        console.log(`${rows} records added into ${'PROTOCOL_RESERVES'}`);
    } catch (err) {
        console.log(err);
    }
}

const loadStrategies = async () => {
    try {
        let rows = 0;
        for (const strategy of getStrategies()) {
            const strategies = await query('insert_protocol_strategies.sql', strategy);
            checkQueryResult(strategies, 'PROTOCOL_STRATEGIES');
            rows += strategies.rowCount;
        }
        console.log(`${rows} records added into ${'PROTOCOL_STRATEGIES'}`);
    } catch (err) {
        console.log(err);
    }
}

const loadExposureStables = async () => {
    try {
        let rows = 0;
        for (const stable of getExposureStables()) {
            const stables = await query('insert_protocol_exposure_stables.sql', stable);
            checkQueryResult(stables, 'PROTOCOL_EXPOSURE_STABLES');
            rows += stables.rowCount;
        }
        console.log(`${rows} records added into ${'PROTOCOL_EXPOSURE_STABLES'}`);
    } catch (err) {
        console.log(err);
    }
}

const loadExposureProtocols = async () => {
    try {
        let rows = 0;
        for (const stable of getExposureProtocols()) {
            const stables = await query('insert_protocol_exposure_protocols.sql', stable);
            checkQueryResult(stables, 'PROTOCOL_EXPOSURE_PROTOCOLS');
            rows += stables.rowCount;
        }
        console.log(`${rows} records added into ${'PROTOCOL_EXPOSURE_PROTOCOLS'}`);
    } catch (err) {
        console.log(err);
    }
}

module.exports = {
    loadAPY,
    loadTVL,
    loadSystem,
    loadVaults,
    loadReserves,
    loadLifeguard,
    loadStrategies,
    loadExposureStables,
    loadExposureProtocols,
}