require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const {
    SettingError,
    ParameterError,
    ContractCallError,
} = require('../common/error');
const {
    sendMessage,
    DISCORD_CHANNELS,
} = require('../common/discord/discordService');
const customLogger = require('./statsLogger');

const statsRouter = require('./routes/stats');
const scheduler = require('./scheduler/statsScheduler');
const { initAllContracts } = require('../contract/allContracts');
const { initAddressAndHistory } = require('../registry/registryLoader');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/stats', cors(), statsRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404));
});

app.use((error, req, res, next) => {
    customLogger.error(error);
    if (error instanceof SettingError) {
        res.status(400).json({ message: `${error.name}: ${error.message}` });
    } else {
        next(error);
    }
});

app.use((error, req, res, next) => {
    customLogger.error(error);
    if (error instanceof ParameterError) {
        res.status(400).json({ message: `${error.name}: ${error.message}` });
    } else {
        next(error);
    }
});

app.use((error, req, res, next) => {
    customLogger.error(error);
    if (error instanceof ContractCallError) {
        res.status(400).json({ message: `${error.name}: ${error.message}` });
        sendMessage(DISCORD_CHANNELS.botLogs, {
            message: `${error}, Url ${req.originalUrl}`,
        });
    } else {
        next(error);
    }
});

app.use((error, req, res, next) => {
    customLogger.error(`${error.name}: ${error.message}`);
    res.status(500).json({ message: `${error.name} : ${error.message}` });
    sendMessage(DISCORD_CHANNELS.botLogs, {
        message: `${error}, Url ${req.originalUrl}`,
    });
    next(error);
});

// start the schedule task
initAddressAndHistory().then(() => {
    scheduler.starStatsJobs();
    console.log('init done!');
});

module.exports = app;
