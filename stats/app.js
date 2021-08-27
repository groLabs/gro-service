require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const actuator = require('express-actuator');

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
const { loadContractInfoFromRegistry } = require('../registry/registryLoader');
const { sendAlertMessage } = require('../common/alertMessageSender');
const { contractCallFailedCount } = require('./common/contractStorage');
const { getConfig } = require('../common/configUtil');

const failedAlertTimes = getConfig('call_failed_time', false) || 3;

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(
    logger('dev', {
        stream: { write: (message) => customLogger.info(message) },
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(actuator());
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
        // sendMessage(DISCORD_CHANNELS.botLogs, {
        //     message: `${error}, Url ${req.originalUrl}`,
        // });
        contractCallFailedCount.personalStas += 1;
        if (contractCallFailedCount.personalStas >= failedAlertTimes) {
            sendAlertMessage({
                discord: {
                    description: `[WARN] B4 - Get personal stats failed for ${error.message} at ${req.originalUrl}`,
                },
            });
        }
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
loadContractInfoFromRegistry().then(() => {
    scheduler.starStatsJobs();
});

module.exports = app;
