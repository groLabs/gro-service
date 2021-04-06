require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var { SettingError, ParameterError } = require('../common/customErrors');
var customLogger = require('../common/logger');

var botRouter = require('./routes/bot');
var statsRouter = require('./routes/stats');
var scheduler = require('./scheduler/statsScheduler');
//var blockListener = require('./jobs/blockListener');
var { initAllContracts } = require('../contract/allContracts');
var cors = require('cors');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/bot', cors(), botRouter);
app.use('/stats', cors(), statsRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

app.use(function handleSettingError(error, req, res, next) {
    customLogger.error(error);
    if (error instanceof SettingError) {
        res.status(400).json({ message: `${error.name}: ${error.message}` });
    } else {
        next(error);
    }
});

app.use(function handleParameterError(error, req, res, next) {
    customLogger.error(error);
    if (error instanceof ParameterError) {
        res.status(400).json({ message: `${error.name}: ${error.message}` });
    } else {
        next(error);
    }
});

app.use(function handleDefaultError(error, req, res, next) {
    customLogger.error(`${error.name}: ${error.message}`);
    res.status(500).json({ message: error.name + ': ' + error.message });
    next(error);
});

// start the schedule task
initAllContracts().then((resolve, rejected) => {
    //blockListener.start();
    scheduler.starStatsJobs();
});

module.exports = app;
