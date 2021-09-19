require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
// const {
//     SettingError,
//     ParameterError,
//     ContractCallError,
// } = require('../common/error');
// const customLogger = require('./lbpLogger');
const statsRouter = require('./routes/lbp');
const scheduler = require('./scheduler/lbpScheduler');

const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Express setup
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/lbp', cors(), statsRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404));
});

// Avoid 'GET /favicon.ico NotFoundError
app.get('/favico.ico', (req, res) => {
    res.sendStatus(404);
});

// start the schedule task
scheduler.startLbpStatsJobs();

module.exports = app;
