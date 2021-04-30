require('dotenv').config();

const scheduler = require('./scheduler/criticalScheduler.js');
const { initAllContracts } = require('../contract/allContracts');

initAllContracts().then(() => {
    scheduler.startCriticalJobs();
});
