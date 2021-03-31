require('dotenv').config();

const scheduler = require('./criticalScheduler.js');
const { initAllContracts } = require('../contract/allContracts');

initAllContracts().then(() => {
    scheduler.startCriticalJobs();
});
