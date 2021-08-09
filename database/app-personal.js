// const { loadGroStatsLiveDB } = require('./loader/personalLiveLoader');
const { loadPersonalStats } = require('./loader/loadPersonalStats');
const { initAllContracts } = require('../contract/allContracts');


initAllContracts().then(async () => {
    await loadPersonalStats();
    process.exit(0);
});
