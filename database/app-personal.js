const { etlPersonalStatsCache } = require('./etl/etlPersonalStatsCache');
const { etlPersonalStats } = require('./etl/etlPersonalStats');
const { initAllContracts } = require('../contract/allContracts');
const { loadContractInfoFromRegistry } = require('../registry/registryLoader');


(async () => {
    try {
        const params = process.argv.slice(2);
        if (params.length > 0) {
            if (params.length === 2) {
                await loadContractInfoFromRegistry();
                await etlPersonalStats(params[0], params[1]);
            } else {
                console.log('Wrong parameters for Personal load - e.g.: 28/06/2021 29/06/2021');
            }
            
        } else {
            await loadContractInfoFromRegistry();
            // Testing personal stats
            await etlPersonalStats('27/06/2021', '27/06/2021');
            // Testing personal stats cache
            // await etlPersonalStatsCache('0xb5bE4d2510294d0BA77214F26F704d2956a99072');
        }
        process.exit(0);
    } catch (err) {
        console.log(err);
    }
})();



// loadContractInfoFromRegistry().then(async () => {
//     await etlPersonalStats();
//     // await etlPersonalStatsCache('0xb5bE4d2510294d0BA77214F26F704d2956a99072');
//     // process.exit(0);
// });

