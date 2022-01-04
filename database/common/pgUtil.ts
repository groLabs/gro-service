import fs from 'fs';
import moment from 'moment';
import { pool } from '../handler/queryHandler';
import { getConfig } from '../../common/configUtil';
import { TABLE_WHITELIST } from '../constants';
import { Bool } from '../types';
const copyTo = require('pg-copy-streams').to
const statsDir = getConfig('stats_folder');
import {
    showInfo,
    showError,
} from '../handler/logHandler';


/// @notice Generate CSV file in '/stats' folder
/// @param  tableName The name of the table dumped
/// @param  data The records from the table dumped
const createCSV = (
    tableName: string,
    data: string
) => {
    try {
        const currentFile = `${statsDir}/dump_${tableName}_${moment().unix()}.csv`;
        fs.writeFileSync(currentFile, data);
    } catch (err) {
        showError('pgUtil.ts->createCSV()', err);
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
const dumpTable = async (
    tableName: string,
    isAdmin: Bool
) => {
    return new Promise(async (resolve) => {
        try {
            if (isAdmin === Bool.TRUE || TABLE_WHITELIST.includes(tableName)) {
                let data: string = '';
                const client = await pool.connect();
                let stream = client.query(copyTo(`COPY gro."${tableName}" TO STDOUT with CSV HEADER DELIMITER '|'`));
                showInfo(`Dumping table <${tableName}> ...`);

                stream.on('data', (chunk: string) => {
                    data += chunk;
                });
                stream.on('end', () => {
                    showInfo(`Table <${tableName}> dumped successfully`);
                    if (isAdmin)
                        createCSV(tableName, data);
                    resolve(data);
                });
                stream.on('error', err => {
                    showError('pgUtil.ts->dumpTable()', err);
                    resolve(`Error found during table dump: ${err}`);
                });
            } else {
                const msg: string = `Table <${tableName}> not eligible for data dump`;
                showError('pgUtil.ts->dumpTable()', msg);
                resolve(msg);
            }
        } catch (err) {
            showError('pgUtil.ts->dumpTable()', err);
        }
    });
}

export {
    dumpTable,
}
