"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const criticalScheduler_1 = __importDefault(require("./scheduler/criticalScheduler"));
const allContracts_1 = require("../contract/allContracts");
allContracts_1.initAllContracts().then(() => {
    criticalScheduler_1.default();
});
