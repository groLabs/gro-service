"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dumpTable = void 0;
const fs_1 = __importDefault(require("fs"));
const moment_1 = __importDefault(require("moment"));
const queryHandler_1 = require("../handler/queryHandler");
const configUtil_1 = require("../../common/configUtil");
const constants_1 = require("../constants");
const copyTo = require('pg-copy-streams').to;
const statsDir = (0, configUtil_1.getConfig)('stats_folder');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
/// @notice Generate CSV file in '/stats' folder
/// @param  tableName The name of the table dumped
/// @param  data The records from the table dumped
const createCSV = (tableName, data) => {
    try {
        const currentFile = `${statsDir}/dump_${tableName}_${(0, moment_1.default)().unix()}.csv`;
        fs_1.default.writeFileSync(currentFile, data);
    }
    catch (err) {
        logger.error(`**DB: Error in pgUtil.js->createCSV(): ${err}`);
    }
};
/// @notice Dump all records from a table using COPY command and streams
/// @param  tableName The name of the table to be dumped
/// @param  isAdmin A flag to choose whether performing admin actions or not:
///         'yes': any table can be dumped, a CSV file is generated in /stats folder
///         'no': only tables from TABLE_WHITELIST can be dumped, no CSV file is generated
/// @dev    isAdmin='yes' will be commonly used inside the bot host to dump any table into CSV,
///         whereas isAdmin='no' will be used through API call to provide data to Dashboards
/// @return Table data if no exceptions found, error description otherwise
const dumpTable = async (tableName, isAdmin) => {
    return new Promise(async (resolve) => {
        try {
            if (isAdmin || constants_1.TABLE_WHITELIST.includes(tableName)) {
                let data = '';
                const client = await queryHandler_1.pool.connect();
                let stream = client.query(copyTo(`COPY gro."${tableName}" TO STDOUT with CSV HEADER DELIMITER '|'`));
                logger.info(`**DB: Dumping table <${tableName}> ...`);
                stream.on('data', chunk => {
                    data += chunk;
                });
                stream.on('end', () => {
                    logger.info(`**DB: Table <${tableName}> dumped successfully`);
                    if (isAdmin)
                        createCSV(tableName, data);
                    resolve(data);
                });
                stream.on('error', err => {
                    logger.error(`**DB: Error in pgUtil.js->dumpTable(): ${err}`);
                    resolve(`Error found during table dump: ${err}`);
                });
            }
            else {
                resolve(`**DB: Table <${tableName}> not eligible for data dump`);
            }
        }
        catch (err) {
            logger.error(`**DB: Error in pgUtil.js->dumpTable(): ${err}`);
        }
    });
};
exports.dumpTable = dumpTable;
