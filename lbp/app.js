const {
    getLbpStatsDB,
    getLbpStatsFile,
} = require('./handler/lbpHandler');
const {
    etlLbpStats,
    etlLbpStatsHDL,
    etlRecovery,
} = require('./etl/etlLbpStats');
const {
    etlLbpStatsV2,
    etlLbpStatsV2_vol,
    etlLbpStatsHDLV2,
} = require('./etl/etlLbpStatsV2');
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
                        await etlLbpStatsHDLV2(
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
        // await etlLbpStats();
        // await etlLbpStatsV2();
        await etlLbpStatsV2_vol();
        // await etlLbpStatsHDLV2(1631703600, 1631736000, 3600, false); //
        // await etlLbpStatsHDLV2(1631631600, 1631890800, 3600, false);  //aKlima
        // await etlLbpStatsHDLV2(1631876400, 1632135600, 3600, true);  //Gro v2 rinkeby
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
        // const block = (await findBlockByDate(moment.unix(1631318400).utc(), true)).block;
        // console.log(block);

        process.exit(0);
    } catch (err) {
        console.log(err);
    }
})();
