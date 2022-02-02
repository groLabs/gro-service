require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const actuator = require('express-actuator');
const { initAllAvaxContracts } = require('./contract/avaxAllContracts');
const scheduler = require('./scheduler/avaxScheduler');
const regularLogger = require('./avaxharvestLogger');
const app = express();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(logger('dev', {
    stream: { write: (message) => regularLogger.info(message) },
}));
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
initAllAvaxContracts();
scheduler.startHarvestJobs();
module.exports = app;