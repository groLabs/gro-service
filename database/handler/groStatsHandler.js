const { 
    loadAPY,
    loadTVL,
    loadVaults,
    loadSystem,
    loadLifeguard,
    loadStrategies,
    loadExposureStables,
    loadExposureProtocols,
} = require('../loader/loadGroStats');

const groStatsHandler = async () => {
    await Promise.all([
        loadAPY(),
        loadTVL(),
        loadSystem(),
        loadVaults(),
        loadStrategies(),
        loadExposureStables(),
        loadExposureProtocols(),
        loadLifeguard(),
    ])
    process.exit(); // for testing purposes
}

module.exports = {
    groStatsHandler,
}
