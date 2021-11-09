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
const express_actuator_1 = __importDefault(require("express-actuator"));
const allContracts_1 = require("../contract/allContracts");
const criticalScheduler_1 = __importDefault(require("./scheduler/criticalScheduler"));
const criticalLogger = require('./criticalLogger');
const app = (0, express_1.default)();
// view engine setup
app.set('views', path_1.default.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use((0, morgan_1.default)('dev', {
    stream: { write: (message) => criticalLogger.info(message) },
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
app.use((0, express_actuator_1.default)());
// catch 404 and forward to error handler
app.use((req, res, next) => {
    next((0, http_errors_1.default)(404));
});
// start the schedule task
(0, allContracts_1.initAllContracts)().then(() => {
    (0, criticalScheduler_1.default)();
});
module.exports = app;
