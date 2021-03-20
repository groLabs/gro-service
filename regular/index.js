require('dotenv').config();

const scheduler = require('./regularScheduler');
const { initAllContracts } = require('../contract/allContracts');
initAllContracts().then(() => {
    scheduler.startRegularJobs();
});
