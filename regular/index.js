require('dotenv').config();

const scheduler = require('./scheduler/regularScheduler');
const { initAllContracts } = require('../dist/contract/allContracts');

initAllContracts().then(() => {
    scheduler.startRegularJobs();
});
