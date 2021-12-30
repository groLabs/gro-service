import { etlGroStatsMC } from './etl/etlGroStatsMC';
import { etlPriceCheck, etlPriceCheckHDL } from './etl/etlPriceCheck';
import { etlPersonalStats } from './etl/etlPersonalStats';
import { etlPersonalStatsCache } from './etl/etlPersonalStatsCache';
import { loadContractInfoFromRegistry } from '../registry/registryLoader';
import { getPriceCheck } from './handler/priceCheckHandler';
import { checkDateRange } from './common/globalUtil';
// import scheduler from './scheduler/dbStatsScheduler';
import { getHistoricalAPY } from './handler/historicalAPY';
import { loadUserBalances } from './loader/loadUserBalances';
import { etlTokenPrice } from './etl/etlTokenPrice';
import { dumpTable } from './common/pgUtil';
import { runTest } from './caller/multiCaller';
import {
    status,
    isContract,
    groAirdropHolders,
} from './common/statusUtil';
import { airdrop4Handler, airdrop4HandlerV2, checkPosition } from './handler/airdrop4handler';


(async () => {
    try {
        const params: string[] = process.argv.slice(2);

        if (params.length > 0) {
            switch (params[0]) {
                case 'priceCheckHDL':
                    if (params.length === 3) {
                        await etlPriceCheckHDL(
                            parseInt(params[1]),    // start timestamp
                            parseInt(params[2]));   // end timestamp
                    } else {
                        console.log('Wrong parameters for Price Check HDL - e.g.: priceCheckHDL 1626825600 1626912000');
                    }
                    break;
                // case 'groStatsHDL':
                //     if (params.length === 5) {
                //         await etlGroStatsHDL(
                //             parseInt(params[1]),    // start timestamp
                //             parseInt(params[2]),    // end timestamp
                //             params[3],              // attribute
                //             parseInt(params[4]));   // interval (in seconds)
                //     } else {
                //         console.log('Wrong parameters for groStats HDL - e.g.: groStats 1626825600 1626912000');
                //     }
                //     break;
                case 'personalStatsETL':
                    if (params.length === 4 && checkDateRange(params[1], params[2])) {
                        await loadContractInfoFromRegistry();
                        await etlPersonalStats(
                            params[1],              // start date
                            params[2],              // end date
                            parseInt(params[3]));   // network (1: Ethereum, 2: Avalanche, 100: All)
                    } else {
                        console.log('Wrong parameters for personal stats ETL - e.g.: personalStatsETL 28/06/2021 29/06/2021 100');
                    }
                    break;
                case 'personalStatsETLcache':
                    if (params.length === 2) {
                        await loadContractInfoFromRegistry();
                        await etlPersonalStatsCache(
                            params[1]); // account
                    } else {
                        console.log('Wrong parameters for personal stats ETL cache - e.g.: personalStatsETLcache 0x...');
                    }
                    break;
                case 'loadTokenPrice':
                    if (params.length === 1) {
                        await loadContractInfoFromRegistry();
                        await etlTokenPrice();
                    } else {
                        console.log('No parameters for token price should be set');
                    }
                    break;
                case 'loadBalances':
                    if (params.length === 5 && checkDateRange(params[1], params[2])) {
                        await loadContractInfoFromRegistry();
                        await loadUserBalances(
                            params[1],              // start date
                            params[2],              // end date
                            params[3],              // account
                            params[4]);              // time
                    } else {
                        console.log(`Wrong parameters for loadBalances - e.g.: loadBalances 16/11/2021 16/11/2021 "" 15:00:00`);
                    }
                    break;
                case 'airdrop4':
                    if (params.length === 4) {
                        await loadContractInfoFromRegistry();
                        await airdrop4HandlerV2(
                            parseInt(params[1]),    // start position in addr list
                            parseInt(params[2]),    // end position in addr list
                            params[3]);             // timestamp
                    } else {
                        console.log('Wrong parameters for Airdrop4 - e.g.: airdrop4 0 250');
                    }
                    break;
                case 'groAirdropHolders':
                    if (params.length === 2) {
                        await loadContractInfoFromRegistry();
                        await groAirdropHolders(
                            parseInt(params[1]));     // timestamp
                    } else {
                        console.log(`Wrong parameters for status - e.g.: status 15/11/2021 15:00:00 ""`);
                    }
                    break;
                case 'checkPosition':
                    if (params.length === 3) {
                        await loadContractInfoFromRegistry();
                        await checkPosition(
                            params[1],    // address
                            params[2]);   // timestamp
                    } else {
                        console.log('Wrong parameters for checkPosition - e.g.: checkPosition 0x04D97063b14c89af39741475054cFaDC9eA4487F 07/10/2021');
                    }
                    break;
                case 'dumpTable':
                    if (params.length === 3 && (params[2] === '0' || params[2] === '1')) {
                        await dumpTable(
                            params[1],              // table name
                            parseInt(params[2]));   // isAdmin (0: false / 1: true)
                    } else {
                        console.log('Wrong parameters for dumpTable - e.g.: dumpTable PROTOCOL_PRICE_CHECK_DETAIL 1');
                    }
                    break;
                case 'status':
                    if (params.length === 4) {
                        await loadContractInfoFromRegistry();
                        await status(
                            params[1],      // date
                            params[2],      // time
                            params[3]);     // block
                    } else {
                        console.log(`Wrong parameters for status - e.g.: status 15/11/2021 15:00:00 ""`);
                    }
                    break;
                default:
                    console.log(`Unknown parameter/s: ${params}`);
                    break;
            }
            process.exit(0);
        }

        // Status:
        // await loadContractInfoFromRegistry();
        // await getCombinedGro();
        // await isContract();

        // Multicall
        await runTest();

        // Testing groStats
        // await etlGroStats();
        // await etlGroStatsHDL(1623844800,1623844800,'apy',1800);
        // await etlGroStatsMC();

        // Testing priceCheck
        // await etlPriceCheck();
        // console.log(await getPriceCheck());
        // await etlPriceCheckHDL(1626825600, 16269120001);

        // Testing Historical APY
        // const attr = 'apy_last7d,apy_last7d,apy_last7d';
        // const freq = 'twice_daily,daily,weekly';
        // const start = '1625097600,1625097600,1625097600';
        // const end = '1629936000,1629936000,1629936000';
        // const attr = 'apy_last7d';
        // const freq = 'daily';
        // const start = 1625097600;
        // const end = 1629936000;
        // const end = 16299;
        // const res = await getHistoricalAPY(attr, freq, start, end);
        // console.log(res);

        // Testing personal stats cache
        // await loadContractInfoFromRegistry();
        // await etlPersonalStatsCache('0xb5bE4d2510294d0BA77214F26F704d2956a99072');

        // Testing user balances with tokenCounter
        // await loadContractInfoFromRegistry();
        // await loadUserBalances2('26/10/2021', '26/10/2021', null);
        // await loadUserBalances2('26/10/2021', '26/10/2021', '0xa31f8afd785EC32df8Df77Ab83978E49Cc0349Ac');
        // await loadTokenPrice('27/10/2021');

        process.exit(0);
    } catch (err) {
        console.log(err);
    }
})();
