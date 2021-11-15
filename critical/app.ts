require('dotenv').config();
import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import actuator from 'express-actuator';

import { initAllContracts } from '../contract/allContracts';
import startCriticalJobs from './scheduler/criticalScheduler';
const criticalLogger = require('./criticalLogger');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(
    logger('dev', {
        stream: { write: (message) => criticalLogger.info(message) },
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(actuator());
// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404));
});

// start the schedule task
initAllContracts().then(() => {
    startCriticalJobs();
});

module.exports = app;
