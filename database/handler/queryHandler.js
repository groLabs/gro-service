require('dotenv').config()
const pg = require('pg');
const fs = require('fs');
const path = require('path');

const { DatabaseCallError } = require('../../common/error');
const botEnv = process.env.BOT_ENV.toLowerCase();
const nodeEnv = process.env.NODE_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../../${botEnv}/${botEnv}Logger`);

const dbConnection = {
    host: (nodeEnv === 'kovan') ? process.env.DB_DEV_HOST : process.env.DB_PROD_HOST,
    port: (nodeEnv === 'kovan') ? process.env.DB_DEV_PORT : process.env.DB_PROD_PORT,
    user: (nodeEnv === 'kovan') ? process.env.DB_DEV_USER : process.env.DB_PROD_USER,
    password: (nodeEnv === 'kovan') ? process.env.DB_DEV_PASSWORD : process.env.DB_PROD_PASSWORD,
    database: (nodeEnv === 'kovan') ? process.env.DB_DEV_INSTANCE : process.env.DB_PROD_INSTANCE,
}

const pool = new pg.Pool(dbConnection);
const QUERY_ERROR = 400;

const query = async (file, params) => {
    let option;
    switch (file.slice(0, 1)) {
        case 'i':
            option = 'insert';
            break;
        case 's':
            option = 'select';
            break;
        case 't':
            option = 'truncate';
            break;
        case 'd':
            option = 'delete';
            break;
        case 'u':
            option = 'update';
            break;
        default: return;
    }

    const q = fs.readFileSync(path.join(__dirname, `/../queries/${option}/${file}`), 'utf8');

    const result = (file === 'insert_tmp_user_deposits.sql' || file === 'insert_tmp_user_withdrawals.sql') 
        ? await batchQuery(q, file, option, params)
        : await singleQuery(q, file, option, params);

    if (result === QUERY_ERROR) {
        return 400;
    } else {
        return result;
    }
}

const singleQuery = async (q, file, op, params) => {
    try {
        //TODO: test when DB is down
        const client = await pool.connect();
        try {
            const result = await client.query(q, params);
            if ((op === 'insert') || (op == 'update') || (op == 'delete')) { await client.query('COMMIT') }
            return result;
        } catch (err) {
            if ((op === 'insert') || (op == 'update') || (op == 'delete')) { await client.query('ROLLBACK') }
            logger.error(`**DB: queryHandler.js->singleQuery() \n Message: ${err} \n Query: ${file} \n Params: ${params}`);
            return 400;
        } finally {
            client.release();
        }
    } catch (err) {
        logger.error(`**DB: queryHandler.js->singleQuery() \n Message: ${err}`);
        return 400;
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
            return rows;
        } catch (err) {
            if ((op === 'insert') || (op == 'update')) { await client.query('ROLLBACK') }
            logger.error(`**DB: queryHandler.js->batchQuery() \n Message: ${err} \n Query: ${file} \n Params: ${params}`);
            return 400;
        } finally {
            client.release();
        }
    } catch (err) {
        console.log('**DB: queryHandler.js->batchQuery() \n Message: ', err);
        return 400;
    }
};

module.exports = {
    query
};
