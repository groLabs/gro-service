require('dotenv').config();
import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';
import actuator from 'express-actuator';

import { SettingError, ParameterError, ContractCallError } from '../common/error';
import { sendMessage, DISCORD_CHANNELS } from '../common/discord/discordService';
const customLogger = require('./statsLogger');

import statsRouter from './routes/stats';
import { starStatsJobs as scheduler } from './scheduler/statsScheduler';
import { loadContractInfoFromRegistry } from '../registry/registryLoader';
import { sendAlertMessage } from '../common/alertMessageSender';
import { contractCallFailedCount } from './common/contractStorage';
import { getConfig } from '../common/configUtil';

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
        const { originalUrl } = req;
        const pathStr = originalUrl.split('?')[0];
        if (pathStr === '/stats/gro_personal_position') {
            contractCallFailedCount.personalStats += 1;
        } else if (pathStr === '/stats/gro_personal_position_mc') {
            contractCallFailedCount.personalMCStats += 1;
        }

        if (
            contractCallFailedCount.personalStats >= failedAlertTimes ||
            contractCallFailedCount.personalMCStats >= failedAlertTimes
        ) {
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
    scheduler();
});

module.exports = app;
