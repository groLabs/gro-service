const { getLbpStats } = require('./handler/lbpHandler');
const { etlLbpStats, etlLbpStatsHDL} = require('./etl/etlLbpStats');
const { loadContractInfoFromRegistry } = require('../registry/registryLoader');

(async () => {
    try {
        const params = process.argv.slice(2);

        if (params.length > 0) {
            switch (params[0]) {
                case 'XXXX':
                    if (params.length === 3) {
                        //TBC
                    } else {
                        console.log('Wrong parameters for Price Check HDL - e.g.: priceCheckHDL 1626825600 1626912000');
                    }
                    break;
                default:
                    console.log(`Unknown parameter/s: ${params}`);
                    break;
            }
            process.exit(0);
        }

        // Testing LBP
        // await loadContractInfoFromRegistry(); // not needed
        // await etlLbpStats();
        await etlLbpStatsHDL(1631035645, 1631036145, 300);
        // console.log(await getLbpStats());

        process.exit(0);
    } catch (err) {
        console.log(err);
    }
})();

