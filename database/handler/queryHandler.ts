require('dotenv').config()
import pg from 'pg';
import fs from 'fs';
import path from 'path';
const { getConfig } = require('../../common/configUtil');
// import { DatabaseCallError } from '../../common/error';

const botEnv = process.env.BOT_ENV.toLowerCase();
const nodeEnv = process.env.NODE_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../../${botEnv}/${botEnv}Logger`);

const db = getConfig('database');
const dbConnection = {
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.database,
}
const pool = new pg.Pool(dbConnection);

const QUERY_OK = 200;
const QUERY_NO_DATA = 204;
// const QUERY_ERROR = 400;
const { QUERY_ERROR } = require('../constants');


const ERROR = {
    status: 400,
};
const NO_DATA = {
    status: 204,
}

const query = async (file, params) => {
    try {
        let option;
        switch (file.slice(0, 4)) {
            case 'inse':
                option = 'insert';
                break;
            case 'sele':
                option = 'select';
                break;
            case 'trun':
                option = 'truncate';
                break;
            case 'dele':
                option = 'delete';
                break;
            case 'upda':
                option = 'update';
                break;
            case 'view':
                option = 'view';
            default: return ERROR;
        }

        const q = fs.readFileSync(path.join(__dirname, `/../queries/${option}/${file}`), 'utf8');

        const result = (
            file === 'insert_user_std_tmp_deposits.sql' ||
            file === 'insert_user_std_tmp_withdrawals.sql' ||
            file === 'insert_user_cache_tmp_deposits.sql' ||
            file === 'insert_user_cache_tmp_withdrawals.sql')
            ? await batchQuery(q, file, option, params)
            : await singleQuery(q, file, option, params);

        if (result === QUERY_ERROR) {
            return ERROR;
        } else {
            return result;
        }
    } catch (err) {
        logger.error(`**DB: queryHandler.js->query(): ${err}`);
        return ERROR;
    }
}

const singleQuery = async (q, file, op, params) => {
    try {
        //TODO: test when DB is down
        const client = await pool.connect();
        try {
            const result = await client.query(q, params);
            if ((op === 'insert') || (op == 'update') || (op == 'delete')) { await client.query('COMMIT') }
            if (result) {
                result.status = 200;
                return result;
            } else {
                return NO_DATA;
            }
        } catch (err) {
            if ((op === 'insert') || (op == 'update') || (op == 'delete')) { await client.query('ROLLBACK') }
            logger.error(`**DB: queryHandler.js->singleQuery() \n Message: ${err} \n Query: ${file} \n Params: ${params}`);
            return ERROR;
        } finally {
            client.release();
        }
    } catch (err) {
        logger.error(`**DB: queryHandler.js->singleQuery() \n Message: ${err}`);
        return ERROR;
    }
};

const batchQuery = async (q, file, op, params) => {
    try {
        const client = await pool.connect();
        try {
            let rows = 0
            for (let i = 0; i < params.length; i++) {
                const result = await client.query(q, params[i]);
                rows += result.rowCount;
            }
            if ((op === 'insert') || (op == 'update')) { await client.query('COMMIT') }
            return [true, rows];
        } catch (err) {
            if ((op === 'insert') || (op == 'update')) { await client.query('ROLLBACK') }
            logger.error(`**DB: queryHandler.js->batchQuery() \n Message: ${err} \n Query: ${file} \n Params: ${params}`);
            return [false, 0];
        } finally {
            client.release();
        }
    } catch (err) {
        logger.error(`**DB: queryHandler.js->batchQuery() \n Message: ${err}`);
        return [false, 0];
    }
};

export {
    query,
    pool,
};
