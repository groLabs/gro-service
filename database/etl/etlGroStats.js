const { query } = require('../handler/queryHandler');
const config = require('config');
const logger = require('../databaseLogger');
const {
    loadAllTables,
    checkLastTimestamp
} = require('../loader/loadGroStats');
const { groStatsCall } = require('../common/groStatsCall');


/* TEST VALUES */
const { stats_new } = require('./sample_new');
const stats2 = stats_new.gro_stats;

// checks last timestamp stored in DB and compares to current statsBot timestamp
const etlGroStats = async () => {
    const lastTimestamp = await checkLastTimestamp();
    if (lastTimestamp) {
        const stats = JSON.parse(await groStatsCall());
        const currentTimestamp = parseInt(stats.gro_stats.launch_timestamp);
        if (currentTimestamp > lastTimestamp) {
            console.log('go loading');
            await loadAllTables(stats2);
        } else {
            console.log('no load needed'); // TODO: to be removed
        }
    } else {
        console.log('No last timestamp found'); // TODO: raise warning
    }
    process.exit(); // TODO: for testing purposes
}

module.exports = {
    etlGroStats,
}
