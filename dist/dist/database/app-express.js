"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const http_errors_1 = __importDefault(require("http-errors"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const morgan_1 = __importDefault(require("morgan"));
const cors_1 = __importDefault(require("cors"));
const error_1 = require("../common/error");
const discordService_1 = require("../common/discord/discordService");
const database_1 = __importDefault(require("./routes/database"));
const dbStatsScheduler_1 = require("./scheduler/dbStatsScheduler");
const customLogger = require('./databaseLogger');
const app = (0, express_1.default)();
// view engine setup
app.set('views', path_1.default.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
app.use('/database', (0, cors_1.default)(), database_1.default);
// catch 404 and forward to error handler
app.use((req, res, next) => {
    next((0, http_errors_1.default)(404));
});
app.use((error, req, res, next) => {
    customLogger.error(error);
    if (error instanceof error_1.SettingError) {
        res.status(400).json({ message: `${error.name}: ${error.message}` });
    }
    else {
        next(error);
    }
});
app.use((error, req, res, next) => {
    customLogger.error(error);
    if (error instanceof error_1.ParameterError) {
        res.status(400).json({ message: `${error.name}: ${error.message}` });
    }
    else {
        next(error);
    }
});
app.use((error, req, res, next) => {
    customLogger.error(error);
    if (error instanceof error_1.ContractCallError) {
        res.status(400).json({ message: `${error.name}: ${error.message}` });
        (0, discordService_1.sendMessage)(discordService_1.DISCORD_CHANNELS.botLogs, {
            message: `${error}, Url ${req.originalUrl}`,
        });
    }
    else {
        next(error);
    }
});
app.use((error, req, res, next) => {
    customLogger.error(`${error.name}: ${error.message}`);
    res.status(500).json({ message: `${error.name} : ${error.message}` });
    (0, discordService_1.sendMessage)(discordService_1.DISCORD_CHANNELS.botLogs, {
        message: `${error}, Url ${req.originalUrl}`,
    });
    next(error);
});
// start the schedule task
// initAllContracts().then(() => {
(0, dbStatsScheduler_1.startDbStatsJobs)();
// });
module.exports = app;
