require('dotenv').config()
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { SqlCommand } from '../types';
const { getConfig } = require('../../common/configUtil');
import { QUERY_ERROR } from '../constants';
import { showError } from '../handler/logHandler';
const db = getConfig('database');

const dbConnection = {
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.database,
}
const pool = new pg.Pool(dbConnection);

const ERROR = {
    status: 400,
};
const NO_DATA = {
    status: 204,
}


const query = async (
    file: string,
    params: any[],
) => {
    try {
        let option;
        switch (file.slice(0, 4)) {
            case 'inse':
                option = SqlCommand.INSERT;
                break;
            case 'sele':
                option = SqlCommand.SELECT;
                break;
            case 'trun':
                option = SqlCommand.TRUNCATE;
                break;
            case 'dele':
                option = SqlCommand.DELETE;
                break;
            case 'upda':
                option = SqlCommand.UPDATE;
                break;
            case 'view':
                option = SqlCommand.VIEW;  //TODO: to be deleted, not used.
            default: return ERROR;
        }

        const q = fs.readFileSync(path.join(__dirname, `/../queries/${option}/${file}`), 'utf8');

        const result =
            file === 'insert_user_deposits_tmp.sql'
                || file === 'insert_user_withdrawals_tmp.sql'
                || file === 'insert_user_deposits_cache.sql'
                || file === 'insert_user_withdrawals_cache.sql'
                ? await batchQuery(q, file, option, params)
                : await singleQuery(q, file, option, params);

        if (result === QUERY_ERROR) {
            return ERROR;
        } else {
            return result;
        }
    } catch (err) {
        showError('queryHandler.ts->query()', err);
        return ERROR;
    }
}

const singleQuery = async (
    q: string,
    file: string,
    op: SqlCommand,
    params: any[],
) => {
    try {
        //TODO: test when DB is down
        const client = await pool.connect();
        try {
            const result = await client.query(q, params);
            if (op === SqlCommand.INSERT
                || op === SqlCommand.UPDATE
                || op === SqlCommand.DELETE) {
                await client.query('COMMIT');
            }
            if (result) {
                result.status = 200;
                return result;
            } else {
                return NO_DATA;
            }
        } catch (err) {
            if (op === SqlCommand.INSERT
                || op === SqlCommand.UPDATE
                || op === SqlCommand.DELETE) {
                await client.query('ROLLBACK');
            }
            showError(
                'queryHandler.ts->singleQuery()',
                `\n Message: ${err} \n Query: ${file} \n Params: ${params}`
            );
            return ERROR;
        } finally {
            client.release();
        }
    } catch (err) {
        showError('queryHandler.ts->singleQuery()', err);
        return ERROR;
    }
}

const batchQuery = async (
    q: string,
    file: string,
    op: SqlCommand,
    params: any[],
) => {
    try {
        const client = await pool.connect();
        try {
            let rows = 0
            for (let i = 0; i < params.length; i++) {
                const result = await client.query(q, params[i]);
                rows += result.rowCount;
            }
            if (op === SqlCommand.INSERT
                || op === SqlCommand.UPDATE) {
                await client.query('COMMIT');
            }
            return [true, rows];
        } catch (err) {
            if (op === SqlCommand.INSERT
                || op === SqlCommand.UPDATE) {
                await client.query('ROLLBACK');
            }
            showError(
                'queryHandler.ts->batchQuery()',
                `\n Message: ${err} \n Query: ${file} \n Params: ${params}`
            );
            return [false, 0];
        } finally {
            client.release();
        }
    } catch (err) {
        showError(
            'queryHandler.ts->batchQuery()',
            `\n Message: ${err}`
        );
        return [false, 0];
    }
}

export {
    query,
    pool,
}
