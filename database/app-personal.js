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
            await etlPersonalStats('28/07/2021', '28/07/2021');
            await etlPersonalStats('29/07/2021', '29/07/2021');
            await etlPersonalStats('30/07/2021', '30/07/2021');
            await etlPersonalStats('31/07/2021', '31/07/2021');

            await etlPersonalStats('01/08/2021', '01/08/2021');
            await etlPersonalStats('02/08/2021', '02/08/2021');
            await etlPersonalStats('03/08/2021', '03/08/2021');
            await etlPersonalStats('04/08/2021', '04/08/2021');
            await etlPersonalStats('05/08/2021', '05/08/2021');
            await etlPersonalStats('06/08/2021', '06/08/2021');
            await etlPersonalStats('07/08/2021', '07/08/2021');
            await etlPersonalStats('08/08/2021', '08/08/2021');
            await etlPersonalStats('09/08/2021', '09/08/2021');
            await etlPersonalStats('10/08/2021', '10/08/2021');
            await etlPersonalStats('11/08/2021', '11/08/2021');
            await etlPersonalStats('12/08/2021', '12/08/2021');
            await etlPersonalStats('13/08/2021', '13/08/2021');
            await etlPersonalStats('14/08/2021', '14/08/2021');
            await etlPersonalStats('15/08/2021', '15/08/2021');
            await etlPersonalStats('16/08/2021', '16/08/2021');
            await etlPersonalStats('17/08/2021', '17/08/2021');
            await etlPersonalStats('18/08/2021', '18/08/2021');
            await etlPersonalStats('19/08/2021', '19/08/2021');
            await etlPersonalStats('20/08/2021', '20/08/2021');
            await etlPersonalStats('21/08/2021', '21/08/2021');
            await etlPersonalStats('22/08/2021', '22/08/2021');
            await etlPersonalStats('23/08/2021', '23/08/2021');
            await etlPersonalStats('24/08/2021', '24/08/2021');
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

