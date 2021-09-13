const {
    getLbpStatsDB,
    getLbpStatsFile,
} = require('./handler/lbpHandler');
const {
    etlLbpStats,
    etlLbpStatsHDL,
    etlRecovery,
} = require('./etl/etlLbpStats');
const { loadContractInfoFromRegistry } = require('../registry/registryLoader');

// testing
const moment = require('moment');
const { getProvider } = require('../database/common/globalUtil');
const { findBlockByDate } = require('../database/common/globalUtil');

(async () => {
    try {
        const params = process.argv.slice(2);

        if (params.length > 0) {
            switch (params[0]) {
                case 'etlLbpStatsHDL':
                    if (params.length === 5) {
                        await etlLbpStatsHDL(
                            parseInt(params[1]),    // start timestamp
                            parseInt(params[2]),    // end timestamp
                            parseInt(params[3]),    // time interval in seconds
                            params[4],              // include latest json file
                        );
                    } else {
                        console.log('Wrong parameters for LBP stats HDL - e.g.: etlLbpStatsHDL 1626825600 1626912000 3600');
                    }
                    break;
                default:
                    console.log(`Unknown parameter/s: ${params}`);
                    break;
            }
            process.exit(0);
        }

        // Testing LBP
        // 1) Testing normal ETL load
        //await etlLbpStats();
        // await new Promise(resolve => setTimeout(resolve, 1000));
        // 2) Testing historical ETL load
        // await etlLbpStatsHDL(1631035645, 1631036145, 300);
        // 3) Testing API request
        // console.log(await getLbpStatsDB());
        // 4) Find a file
        // console.log(findFile('../stats', 'json'));
        // findFile('../stats', 'json');
        // 5) Serve from files
        // console.log(await getLbpStatsFile());
        // 6) Recovery
        // await etlRecovery();

        // Get block data
        // const a = (await getProvider().getBlock());
        // console.log('block:', a);
        // Get block given a timestamp
        const block = (await findBlockByDate(moment.unix(1631318400).utc(), true)).block;
        console.log(block);

        process.exit(0);
    } catch (err) {
        console.log(err);
    }
})();

/*
    Maple Finance in mainnet / Whole LBP
    start timestamp:    1619641800 (28 apr 2021 20:30)
    end timestamp:      1619901900 (01 may 2021 20:45)
    interval:           3600 (1h)
    interval:           300 (5')
*/

/*
    Maple Finance in mainnet / 1 day
    start timestamp:    1619654400 (29 apr 2021 00:00)
    end timestamp:      1619740800 (30 apr 2021 00:00)
    interval:           3600 (1h)
*/