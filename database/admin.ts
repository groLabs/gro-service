import { etlGroStatsMC } from './etl/etlGroStatsMC';
import { etlPriceCheck, etlPriceCheckHDL } from './etl/etlPriceCheck';
import { etlVestingBonus } from './etl/etlVestingBonus';
import { etlPersonalStats } from './etl/etlPersonalStats';
import { etlPersonalStatsCache } from './etl/etlPersonalStatsCache';
import { loadContractInfoFromRegistry } from '../registry/registryLoader';
import { getPriceCheck } from './handler/priceCheckHandler';
import { checkDateRange } from './common/globalUtil';
import { getHistoricalAPY } from './handler/historicalAPY';
import { loadUserBalances } from './loader/loadUserBalances';
import { etlTokenPrice } from './etl/etlTokenPrice';
import { dumpTable } from './common/pgUtil';
import { getMigrateEvents } from './listener/getMigrationEvents';
import {
    vesting,
    getDbStatus,
    setDbStatus
} from './common/statusUtil';
import {
    status,
    isContract,
    groAirdropHolders,
} from './common/statusUtil';
import { airdrop4Handler, airdrop4HandlerV2, checkPosition } from './handler/airdrop4handler';
import { QUERY_SUCCESS } from './constants';
import { GlobalNetwork as GN } from './types';
import { etlStatefulByBlock, etlStatefulByDate } from './etl/etlStateful';


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
                    if (params.length === 5 && checkDateRange(params[1], params[2])) {
                        await loadContractInfoFromRegistry();
                        await etlPersonalStats(
                            params[1],              // start date
                            params[2],              // end date
                            parseInt(params[3]),    // network (1: Ethereum, 2: Avalanche, 100: All)
                            parseInt(params[4]))    // load type (1: Transfers, 2: Approvals, 100: All)
                    } else {
                        console.log('Wrong parameters for personal stats ETL - e.g.: personalStatsETL 28/06/2021 29/06/2021 100 100');
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
                            params[1],  // start date
                            params[2],  // end date
                            params[3],  // account
                            params[4]); // time
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
                case 'vesting':
                    if (params.length === 3) {
                        await loadContractInfoFromRegistry();
                        await vesting(
                            params[1],              // address
                            parseInt(params[2]));   // block
                    } else {
                        console.log(`Wrong parameters for vesting - e.g.: vesting 0xef0905745ce28ebe1ded7004146132fbfba548ba 14319666`);
                    }
                    break;
                case 'getDbStatus':
                    if (params.length === 2) {
                        const stat = await getDbStatus(
                            parseInt(params[1]),      // status id
                        );
                        if (stat.status === QUERY_SUCCESS) {
                            console.log(`**DB: Database status: ${stat.data.statusDesc}`);
                        } else {
                            console.log(stat.data);
                        }
                    } else {
                        console.log(`Wrong parameters for getDbStatus - e.g.: getDbStatus 1`);
                    }
                    break;
                case 'setDbStatus':
                    if (params.length === 3) {
                        await setDbStatus(
                            parseInt(params[1]),      // feature id (1: personalStats)
                            parseInt(params[2]),      // status id (1: Active, 2: Inactive)
                        );
                    } else {
                        console.log(`Wrong parameters for getDbStatus - e.g. setDbStatus 1 2`);
                    }
                    break;
                case 'vestingBonusETL':
                    await loadContractInfoFromRegistry();
                    if (params.length === 2) {
                        await etlVestingBonus(
                            parseInt(params[1])      // isETL (0: false / 1: true)
                        );
                    } else {
                        console.log(`Wrong parameters for vestingBonusETL - e.g. vestingBonusETL 1`);
                    }
                    break;
                case 'etlStatefulByBlock':
                    await loadContractInfoFromRegistry();
                    if (params.length === 5) {
                        const fromBlock = parseInt(params[2]);
                        const toBlock = parseInt(params[3]);
                        const rawEvents = params[4].split(',');
                        const eventCodes = rawEvents.map((event) => parseInt(event));
                        await etlStatefulByBlock(
                            parseInt(params[1]),    // network (1: Ethereum, 2: Avalanche)
                            fromBlock,              // from block
                            toBlock,                // to block
                            fromBlock,              // offset (always from block)
                            eventCodes,             // event codes (array) to be loaded
                        );
                    } else {
                        console.log(`Wrong parameters for etlStatefulByBlock - e.g. etlStatefulByBlock 1 14524648 14539648 1,2,4`);
                    }
                    break;
                case 'etlStatefulByDate':
                    await loadContractInfoFromRegistry();
                    if (params.length === 5) {
                        const rawEvents = params[4].split(',');
                        const eventCodes = rawEvents.map((event) => parseInt(event));
                        await etlStatefulByDate(
                            parseInt(params[1]),    // network (1: Ethereum, 2: Avalanche)
                            params[2],              // start date ('DD/MM/YYYY')
                            params[3],              // end date ('DD/MM/YYYY')
                            eventCodes,             // event codes (array) to be loaded
                        );
                    } else {
                        console.log(`Wrong parameters for etlStatefulByDate - e.g. etlStatefulByDate 1 08/05/2022 10/05/2022 1,2,4`);
                    }
                    break;
                default:
                    console.log(`Unknown parameter/s: ${params}`);
                    break;
            }
            process.exit(0);
        }

        // Vesting Bonus
        // await loadContractInfoFromRegistry();
        // console.log(await getVestingBonus('0x9B7a6E6b894E243E994cfAA32eA07D8a60740981'));

        // Status:
        // await loadContractInfoFromRegistry();
        // await getCombinedGro();
        // await isContract();

        // Multicall
        // await runTest();

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

        // Retrieve migrate user events from LPTokenStakerV2
        // await loadContractInfoFromRegistry();
        // await getMigrateEvents(14268645, 14403332);

        // Testing etlStateful
        //await loadContractInfoFromRegistry();
        //await etlStatefulByBlock(GN.ETHEREUM, 14524648, 14539648, 14524648);
        //await etlStatefulByBlock(GN.AVALANCHE, 13037781, 13117781, 13037781);
        //await etlStatefulByBlock(GN.AVALANCHE, 13141722, 13141723, 13141722); //lily, check sha3
        //await etlStatefulByDate(GN.ETHEREUM, '06/04/2022', '07/04/2022');

        process.exit(0);
    } catch (err) {
        console.log(err);
    }
})();

