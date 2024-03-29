require('dotenv').config();
import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';
import { SettingError, ParameterError, ContractCallError } from '../common/error';
import { sendMessage, DISCORD_CHANNELS } from '../common/discord/discordService';
import statsRouter from './routes/database';
import { startDbStatsJobs } from './scheduler/dbStatsScheduler';
const customLogger = require('./databaseLogger');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/database', cors(), statsRouter);

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
startDbStatsJobs();


module.exports = app;
