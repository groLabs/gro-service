require('dotenv').config();

const scheduler = require('./scheduler/regularScheduler');
const { initAllContracts } = require('../contract/allContracts');
initAllContracts().then(() => {
    scheduler.startRegularJobs();
});
