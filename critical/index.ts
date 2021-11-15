require('dotenv').config();

import startCriticalJobs from './scheduler/criticalScheduler';
import { initAllContracts } from '../contract/allContracts';

initAllContracts().then(() => {
    startCriticalJobs();
});
