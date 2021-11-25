require('dotenv').config();

import scheduler from './scheduler/regularScheduler';
import { initAllContracts } from '../contract/allContracts';

initAllContracts().then(() => {
    scheduler.startRegularJobs();
});
