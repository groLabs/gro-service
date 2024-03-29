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
    TokenId,
    TokenName,
    NetworkName,
} from '../types';
import {
    showInfo,
    showError,
    showWarning,
} from '../handler/logHandler';


const loadAPY = async (stats): Promise<boolean> => {
    try {
        const [
            pwrd,
            gvt
        ] = await Promise.all([
            query(
                'insert_protocol_apy.sql',
                parser.getAPY(stats, NetworkName.MAINNET, TokenName.PWRD, TokenId.PWRD)),
            query(
                'insert_protocol_apy.sql',
                parser.getAPY(stats, NetworkName.MAINNET, TokenName.GVT, TokenId.GVT))
        ]);
        return (checkQueryResult(pwrd, 'PROTOCOL_APY')
            && checkQueryResult(gvt, 'PROTOCOL_APY'))
            ? true : false;
    } catch (err) {
        showError('loadGroStatsMC.ts->loadAPY()', err);
        return false;
    }
}

const loadTVL = async (stats): Promise<boolean> => {
    try {
        const [
            tvl,
            tvlAvax,
        ] = await Promise.all([
            query(
                'insert_protocol_tvl.sql',
                parser.getTVL(stats, NetworkName.MAINNET)),
            query(
                'insert_protocol_avax_tvl.sql',
                parser.getTVL(stats, NetworkName.AVALANCHE)),
        ]);
        return (checkQueryResult(tvl, 'PROTOCOL_TVL'))
            && (checkQueryResult(tvlAvax, 'PROTOCOL_AVAX_TVL'))
            ? true : false;
    } catch (err) {
        showError('loadGroStatsMC.ts->loadTVL()', err);
        return false;
    }
}

const loadLifeguard = async (stats): Promise<boolean> => {
    try {
        const lifeguard = await query(
            'insert_protocol_lifeguard.sql',
            parser.getLifeguard(stats, NetworkName.MAINNET));
        return (checkQueryResult(lifeguard, 'PROTOCOL_LIFEGUARD')) ? true : false;
    } catch (err) {
        showError('loadGroStatsMC.ts->loadLifeguard()', err);
        return false;
    }
}

const loadLifeguardStables = async (stats): Promise<boolean> => {
    try {
        let rows = 0;
        for (const stable of parser.getLifeguardStables(stats, NetworkName.MAINNET)) {
            const stables = await query('insert_protocol_system_lifeguard_stables.sql', stable);
            if (checkQueryResult(stables, 'PROTOCOL_SYSTEM_LIFEGUARD_STABLES')) {
                rows += stables.rowCount;
            } else {
                return false;
            }
        }
        showInfo(`${rows} records added into ${'PROTOCOL_SYSTEM_LIFEGUARD_STABLES'}`);
        return true;
    } catch (err) {
        showError('loadGroStatsMC.ts->loadLifeguardStables()', err);
        return false;
    }
}

const loadSystem = async (stats): Promise<boolean> => {
    try {
        const system = await query('insert_protocol_system.sql', parser.getSystem(stats, NetworkName.MAINNET));
        return (checkQueryResult(system, 'PROTOCOL_SYSTEM')) ? true : false;
    } catch (err) {
        showError('loadGroStatsMC.ts->loadSystem()', err);
        return false;
    }
}

const loadVaults = async (stats): Promise<boolean> => {
    try {
        // Ethereum
        let rows = 0;
        for (const vault of parser.getVaults(stats, NetworkName.MAINNET)) {
            const vaults = await query('insert_protocol_vaults.sql', vault);
            if (checkQueryResult(vaults, 'PROTOCOL_VAULTS')) {
                rows += vaults.rowCount;
            } else {
                return false;
            }
        }
        showInfo(`${rows} records added into ${'PROTOCOL_VAULTS'}`);
        // Avalanche
        rows = 0;
        for (const vault of parser.getVaults(stats, NetworkName.AVALANCHE)) {
            const vaults = await query('insert_protocol_avax_vaults.sql', vault);
            if (checkQueryResult(vaults, 'PROTOCOL_AVAX_VAULTS')) {
                rows += vaults.rowCount;
            } else {
                return false;
            }
        }
        showInfo(`${rows} records added into ${'PROTOCOL_AVAX_VAULTS'}`);
        return true;
    } catch (err) {
        showError('loadGroStatsMC.ts->loadVaults()', err);
        return false;
    }
}

const loadReserves = async (stats): Promise<boolean> => {
    try {
        // Ethereum
        let rows = 0;
        for (const vault of parser.getReserves(stats, NetworkName.MAINNET)) {
            const vaults = await query('insert_protocol_reserves.sql', vault);
            if (checkQueryResult(vaults, 'PROTOCOL_RESERVES')) {
                rows += vaults.rowCount;
            } else {
                return false;
            }
        }
        showInfo(`${rows} records added into ${'PROTOCOL_RESERVES'}`);

        //Avalanche
        rows = 0;
        for (const vault of parser.getReserves(stats, NetworkName.AVALANCHE)) {
            const vaults = await query('insert_protocol_avax_reserves.sql', vault);
            if (checkQueryResult(vaults, 'PROTOCOL_AVAX_RESERVES')) {
                rows += vaults.rowCount;
            } else {
                return false;
            }
        }
        showInfo(`${rows} records added into ${'PROTOCOL_AVAX_RESERVES'}`);

        return true;
    } catch (err) {
        showError('loadGroStatsMC.ts->loadReserves()', err);
        return false;
    }
}

const loadStrategies = async (stats): Promise<boolean> => {
    try {
        // Ethereum
        let rows = 0;
        for (const strategy of parser.getStrategies(stats, NetworkName.MAINNET)) {
            const strategies = await query('insert_protocol_strategies.sql', strategy);
            if (checkQueryResult(strategies, 'PROTOCOL_STRATEGIES')) {
                rows += strategies.rowCount;
            } else {
                return false;
            }
        }
        showInfo(`${rows} records added into ${'PROTOCOL_STRATEGIES'}`);

        // Avalanche
        rows = 0;
        for (const strategy of parser.getStrategies(stats, NetworkName.AVALANCHE)) {
            const strategies = await query('insert_protocol_avax_strategies.sql', strategy);
            if (checkQueryResult(strategies, 'PROTOCOL_AVAX_STRATEGIES')) {
                rows += strategies.rowCount;
            } else {
                return false;
            }
        }
        showInfo(`${rows} records added into ${'PROTOCOL_AVAX_STRATEGIES'}`);

        return true;
    } catch (err) {
        showError('loadGroStatsMC.ts->loadStrategies()', err);
        return false;
    }
}

const loadExposureStables = async (stats): Promise<boolean> => {
    try {
        let rows = 0;
        for (const stable of parser.getExposureStables(stats, NetworkName.MAINNET)) {
            const stables = await query('insert_protocol_exposure_stables.sql', stable);
            if (checkQueryResult(stables, 'PROTOCOL_EXPOSURE_STABLES')) {
                rows += stables.rowCount;
            } else {
                return false;
            }
        }
        showInfo(`${rows} records added into ${'PROTOCOL_EXPOSURE_STABLES'}`);
        return true;
    } catch (err) {
        showError('loadGroStatsMC.ts->loadExposureStables()', err);
        return false;
    }
}

const loadExposureProtocols = async (stats): Promise<boolean> => {
    try {
        let rows = 0;
        for (const stable of parser.getExposureProtocols(stats, NetworkName.MAINNET)) {
            const stables = await query('insert_protocol_exposure_protocols.sql', stable);
            if (checkQueryResult(stables, 'PROTOCOL_EXPOSURE_PROTOCOLS')) {
                rows += stables.rowCount;
            } else {
                return false;
            }
        }
        showInfo(`${rows} records added into ${'PROTOCOL_EXPOSURE_PROTOCOLS'}`);
        return true;
    } catch (err) {
        showError('loadGroStatsMC.ts->loadExposureProtocols()', err);
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
                //loadLifeguardStables(stats),
                loadVaults(stats),
                loadReserves(stats),
                //loadLifeguard(stats),
                loadStrategies(stats),
                loadExposureStables(stats),
                loadExposureProtocols(stats),
            ]);
            if (res.every(Boolean)) {
                await updateTimeStamp(stats.current_timestamp, 'GRO_STATS');
            } else {
                showWarning(
                    'loadGroStatsMC.ts->loadAllTables()',
                    'Table SYS_PROTOCOL_LOADS not updated'
                );
            }
        } else {
            showError(
                'loadGroStatsMC.ts->loadAllTables()',
                'stats JSON structure is not correct'
            );
        }
    } catch (err) {
        showError('loadGroStatsMC.ts->loadAllTables()', err);
    }
}

export {
    loadAPY,
    loadAllTables,
}
