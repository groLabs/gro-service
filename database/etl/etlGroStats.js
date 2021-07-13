const { query } = require('../handler/queryHandler');
const {
    initAllContracts,
} = require('../../contract/allContracts');
const config = require('config');
// const {
//     getController,
//     getGvt,
//     getPwrd,
//     getInsurance,
//     getExposure,
//     getLifeguard,
//     getVaults,
//     getCurveVault,
//     getStrategyLength,
//     getDepositHandler,
//     getWithdrawHandler,
//     getBuoy,
// } = require('../../contract/allContracts');
const logger = require('../databaseLogger');
const {
    loadAPY,
    loadTVL,
    loadVaults,
    loadReserves,
    loadSystem,
    loadLifeguard,
    loadStrategies,
    loadExposureStables,
    loadExposureProtocols,
} = require('../loader/loadGroStats');
// const { generateGroStatsFile } = require('../../stats/handler/statsHandler');



const etlGroStats = async () => {
    await Promise.all([
        loadAPY(),
        loadTVL(),
        loadSystem(),
        loadVaults(),
        loadReserves(),
        loadStrategies(),
        loadExposureStables(),
        loadExposureProtocols(),
        loadLifeguard(),
    ]);
    process.exit(); // for testing purposes



    // initAllContracts().then(async () => {
    //     console.log('go!');
    //     const a = await generateGroStatsFile();
    //     console.log(a);
    //     process.exit(); // for testing purposes
    // });
}

module.exports = {
    etlGroStats,
}
