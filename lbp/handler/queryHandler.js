require('dotenv').config()
const pg = require('pg');
const fs = require('fs');
const path = require('path');
const { getConfig } = require('../../common/configUtil');

const { DatabaseCallError } = require('../../common/error');
const botEnv = process.env.BOT_ENV.toLowerCase();
const nodeEnv = process.env.NODE_ENV.toLowerCase();
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
            // default: return QUERY_ERROR;
            default: return ERROR;
        }
    
        const q = fs.readFileSync(path.join(__dirname, `/../queries/${option}/${file}`), 'utf8');
    
        const result = await singleQuery(q, file, option, params);
    
        if (result === QUERY_ERROR) {
            return ERROR;
        } else {
            return result;
        }
    } catch (err) {
        logger.error(`**LBP: queryHandler.js->query(): ${err}`);
        return ERROR;
    }
}

const singleQuery = async (q, file, op, params) => {
    try {
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
            logger.error(`**LBP: queryHandler.js->singleQuery() \n Message: ${err} \n Query: ${file} \n Params: ${params}`);
            return ERROR;
        } finally {
            client.release();
        }
    } catch (err) {
        logger.error(`**LBP: queryHandler.js->singleQuery() \n Message: ${err}`);
        return ERROR;
    }
};

module.exports = {
    query
};
