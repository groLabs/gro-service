import fs from 'fs';
import moment from 'moment';
import { pool } from '../handler/queryHandler';
import { getConfig } from '../../common/configUtil';
import { TABLE_WHITELIST } from '../constants';

const copyTo = require('pg-copy-streams').to
const statsDir = getConfig('stats_folder');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);


/// @notice Generate CSV file in '/stats' folder
/// @param  tableName The name of the table dumped
/// @param  data The records from the table dumped
const createCSV = (tableName, data) => {
    try {
        const currentFile = `${statsDir}/dump_${tableName}_${moment().unix()}.csv`;
        fs.writeFileSync(currentFile, data);
    } catch (err) {
        logger.error(`**DB: Error in pgUtil.js->createCSV(): ${err}`);
    }
}

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
            if (isAdmin || TABLE_WHITELIST.includes(tableName)) {
                let data = '';
                const client = await pool.connect();
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
            } else {
                resolve(`**DB: Table <${tableName}> not eligible for data dump`)
            }


        } catch (err) {
            logger.error(`**DB: Error in pgUtil.js->dumpTable(): ${err}`);
        }
    });
}

export {
    dumpTable,
}
