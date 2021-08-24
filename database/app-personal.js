const { etlPersonalStatsCache } = require('./etl/etlPersonalStatsCache');
const { etlPersonalStats } = require('./etl/etlPersonalStats');
const { initAllContracts } = require('../contract/allContracts');
const { loadContractInfoFromRegistry } = require('../registry/registryLoader');


// initAllContracts().then(async () => {
//     //await loadPersonalStats();
//     await etlPersonalStatsCache('0xb5bE4d2510294d0BA77214F26F704d2956a99072');
//     process.exit(0);
// });

loadContractInfoFromRegistry().then(async () => {
    await etlPersonalStats();
    // await etlPersonalStatsCache('0xb5bE4d2510294d0BA77214F26F704d2956a99072');
    process.exit(0);
});

// initAllContracts().then(async () => {
//     loadContractInfoFromRegistry().then(async () => {
//         // await loadPersonalStats();
//         await etlPersonalStatsCache('0xb5bE4d2510294d0BA77214F26F704d2956a99072');
//         process.exit(0);
//     });
// });