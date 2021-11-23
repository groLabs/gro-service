"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiCaller = void 0;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const configUtil_1 = require("../../common/configUtil");
const route = (0, configUtil_1.getConfig)('route');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const apiCaller = (options) => {
    return new Promise(async (resolve) => {
        try {
            let payload = "";
            let result;
            if (!options.hostname || !options.port || !options.path) {
                resolve({
                    status: 400,
                    data: `Connection details not found: [hostname: ${options.hostname}]`
                });
            }
            else {
                // Use http when bot is running inside AWS VPC and using msb* name; use https otherwise
                const connection = (options.hostname.slice(0, 3) === 'msb')
                    ? http_1.default
                    : https_1.default;
                const req = connection.request(options, (res) => {
                    res.on('data', (d) => {
                        payload += d;
                    }).on('end', () => {
                        result = {
                            status: res.statusCode,
                            data: payload,
                        };
                        resolve(result);
                    });
                });
                req.on('error', (err) => {
                    logger.error('**DB: Error in apiCaller.js:', err);
                    resolve({
                        status: 400,
                        data: err,
                    });
                });
                req.end();
            }
        }
        catch (err) {
            logger.error('**DB: Error in apiCaller.js:', err);
        }
    });
};
exports.apiCaller = apiCaller;
