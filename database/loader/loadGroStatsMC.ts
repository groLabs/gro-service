/// @notice GroStats loader
///     - Receives gro stats (JSON stucture) as parameter and loads all data into tables
///     - Loads are triggered every 5' by a cron
///     - Two public functions:
///         loadAllTables(): loads all groStats-related tables
///         loadAOY():  called on-demand and loads only APY data into tables (eg: if there
///                     is missing data and there's a need of backfilling it)

import { query } from '../handler/queryHandler';
import * as parser from '../parser/groStatsParserMC';
import { checkQueryResult, updateTimeStamp } from '../common/protocolUtil';
import {
    Network,
    Product,
    ProductId
} from '../types';

const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);


const checkLastTimestamp = async () => {
    return await query('select_last_protocol_load.sql', ['GRO_STATS']);
}

const loadAPY = async (stats) => {
    try {
        const [
            pwrd,
            gvt
        ] = await Promise.all([
            query(
                'insert_protocol_apy.sql',
                parser.getAPY(stats, Network.MAINNET, Product.PWRD, ProductId.PWRD)),
            query(
                'insert_protocol_apy.sql',
                parser.getAPY(stats, Network.MAINNET, Product.GVT, ProductId.GVT))
        ]);
        return (checkQueryResult(pwrd, 'PROTOCOL_APY')
            && checkQueryResult(gvt, 'PROTOCOL_APY'))
            ? true : false;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStatsMC.js->loadAPY(): ${err}`);
        return false;
    }
}

const loadTVL = async (stats) => {
    try {
        const [
            tvl,
            tvlAvax
        ] = await Promise.all([
            query(
                'insert_protocol_tvl.sql',
                parser.getTVL(stats, Network.MAINNET)),
            query(
                'insert_protocol_avax_tvl.sql',
                parser.getTVL(stats, Network.AVALANCHE)),
        ]);
        return (checkQueryResult(tvl, 'PROTOCOL_TVL'))
            && (checkQueryResult(tvl, 'PROTOCOL_AVAX_TVL'))
            ? true : false;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStatsMC.js->loadTVL(): ${err}`);
        return false;
    }
}

const loadLifeguard = async (stats) => {
    try {
        const lifeguard = await query(
            'insert_protocol_lifeguard.sql',
            parser.getLifeguard(stats, Network.MAINNET));
        return (checkQueryResult(lifeguard, 'PROTOCOL_LIFEGUARD')) ? true : false;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStatsMC.js->loadLifeguard(): ${err}`);
        return false;
    }
}

const loadLifeguardStables = async (stats) => {
    try {
        let rows = 0;
        for (const stable of parser.getLifeguardStables(stats, Network.MAINNET)) {
            const stables = await query('insert_protocol_system_lifeguard_stables.sql', stable);
            if (checkQueryResult(stables, 'PROTOCOL_SYSTEM_LIFEGUARD_STABLES')) {
                rows += stables.rowCount;
            } else {
                return false;
            }
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_SYSTEM_LIFEGUARD_STABLES'}`);
        return true;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStatsMC.js->loadLifeguardStables(): ${err}`);
        return false;
    }
}

const loadSystem = async (stats) => {
    try {
        const system = await query('insert_protocol_system.sql', parser.getSystem(stats, Network.MAINNET));
        return (checkQueryResult(system, 'PROTOCOL_SYSTEM')) ? true : false;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStatsMC.js->loadSystem(): ${err}`);
        return false;
    }
}

const loadVaults = async (stats) => {
    try {
        // Ethereum
        let rows = 0;
        for (const vault of parser.getVaults(stats, Network.MAINNET)) {
            const vaults = await query('insert_protocol_vaults.sql', vault);
            if (checkQueryResult(vaults, 'PROTOCOL_VAULTS')) {
                rows += vaults.rowCount;
            } else {
                return false;
            }
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_VAULTS'}`);

        // Avalanche
        rows = 0;
        for (const vault of parser.getVaults(stats, Network.AVALANCHE)) {
            const vaults = await query('insert_protocol_avax_vaults.sql', vault);
            if (checkQueryResult(vaults, 'PROTOCOL_AVAX_VAULTS')) {
                rows += vaults.rowCount;
            } else {
                return false;
            }
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_AVAX_VAULTS'}`);

        return true;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStatsMC.js->loadVaults(): ${err}`);
        return false;
    }
}

const loadReserves = async (stats) => {
    try {
        // Ethereum
        let rows = 0;
        for (const vault of parser.getReserves(stats, Network.MAINNET)) {
            const vaults = await query('insert_protocol_reserves.sql', vault);
            if (checkQueryResult(vaults, 'PROTOCOL_RESERVES')) {
                rows += vaults.rowCount;
            } else {
                return false;
            }
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_RESERVES'}`);

        //Avalanche
        rows = 0;
        for (const vault of parser.getReserves(stats, Network.AVALANCHE)) {
            const vaults = await query('insert_protocol_avax_reserves.sql', vault);
            if (checkQueryResult(vaults, 'PROTOCOL_AVAX_RESERVES')) {
                rows += vaults.rowCount;
            } else {
                return false;
            }
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_AVAX_RESERVES'}`);

        return true;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStatsMC.js->loadReserves(): ${err}`);
        return false;
    }
}

const loadStrategies = async (stats) => {
    try {
        // Ethereum
        let rows = 0;
        for (const strategy of parser.getStrategies(stats, Network.MAINNET)) {
            const strategies = await query('insert_protocol_strategies.sql', strategy);
            if (checkQueryResult(strategies, 'PROTOCOL_STRATEGIES')) {
                rows += strategies.rowCount;
            } else {
                return false;
            }
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_STRATEGIES'}`);

        // Avalanche
        rows = 0;
        for (const strategy of parser.getStrategies(stats, Network.AVALANCHE)) {
            const strategies = await query('insert_protocol_avax_strategies.sql', strategy);
            if (checkQueryResult(strategies, 'PROTOCOL_AVAX_STRATEGIES')) {
                rows += strategies.rowCount;
            } else {
                return false;
            }
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_AVAX_STRATEGIES'}`);

        return true;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStatsMC.js->loadStrategies(): ${err}`);
        return false;
    }
}

const loadExposureStables = async (stats) => {
    try {
        let rows = 0;
        for (const stable of parser.getExposureStables(stats, Network.MAINNET)) {
            const stables = await query('insert_protocol_exposure_stables.sql', stable);
            if (checkQueryResult(stables, 'PROTOCOL_EXPOSURE_STABLES')) {
                rows += stables.rowCount;
            } else {
                return false;
            }
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_EXPOSURE_STABLES'}`);
        return true;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStatsMC.js->loadExposureStables(): ${err}`);
        return false;
    }
}

const loadExposureProtocols = async (stats) => {
    try {
        let rows = 0;
        for (const stable of parser.getExposureProtocols(stats, Network.MAINNET)) {
            const stables = await query('insert_protocol_exposure_protocols.sql', stable);
            if (checkQueryResult(stables, 'PROTOCOL_EXPOSURE_PROTOCOLS')) {
                rows += stables.rowCount;
            } else {
                return false;
            }
        }
        logger.info(`**DB: ${rows} records added into ${'PROTOCOL_EXPOSURE_PROTOCOLS'}`);
        return true;
    } catch (err) {
        logger.error(`**DB: Error in loadGroStatsMC.js->loadExposureProtocols(): ${err}`);
        return false;
    }
}

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
                await updateTimeStamp(stats.current_timestamp, 'GRO_STATS');
            } else {
                logger.warn(`**DB: Error/s found in loadGroStatsMC.js->loadAllTables(): Table SYS_PROTOCOL_LOADS not updated.`);
            }
        } else {
            logger.error(`**DB: Error in loadGroStatsMC.js->loadAllTables(): stats JSON structure is not correct.`);
        }
    } catch (err) {
        logger.error(`**DB: Error in loadGroStatsMC.js->loadAllTables(): ${err}`);
    }
}

export {
    loadAllTables,
    loadAPY,
    checkLastTimestamp,
}
