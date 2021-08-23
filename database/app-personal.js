const { loadPersonalStatsCache } = require('./loader/loadPersonalStatsCache');
const { loadPersonalStats } = require('./loader/loadPersonalStats');
const { initAllContracts } = require('../contract/allContracts');
const { loadContractInfoFromRegistry } = require('../registry/registryLoader');


// initAllContracts().then(async () => {
//     //await loadPersonalStats();
//     await loadPersonalStatsCache('0xb5bE4d2510294d0BA77214F26F704d2956a99072');
//     process.exit(0);
// });


// loadContractInfoFromRegistry().then(async () => {
//     await loadPersonalStatsCache('0xb5bE4d2510294d0BA77214F26F704d2956a99072');
//     process.exit(0);
// });



initAllContracts().then(async () => {
    loadContractInfoFromRegistry().then(async () => {
        await loadPersonalStats();
        //await loadPersonalStatsCache('0xb5bE4d2510294d0BA77214F26F704d2956a99072');
        process.exit(0);
    });
});