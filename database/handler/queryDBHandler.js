require('dotenv').config()
const pg = require('pg');
const fs = require('fs');
const path = require('path');

const dbConnection = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_INSTANCE,
}

const pool = new pg.Pool(dbConnection);


// Use of 'pool.connect' to be able to rollback same pool of transactions in case of failure
const query = async (q, op, args) => {
    try {
        const client = await pool.connect();
        try {
            const result = await client.query(q, args);
            if ((op === 'insert') || (op == 'update')) { await client.query('COMMIT') }
            return result;
        } catch (err) {
            if ((op === 'insert') || (op == 'update')) { await client.query('ROLLBACK') }
            console.log('Error at queries.js -> query(): ', err, q);
            return 400;
        } finally {
            client.release();
        }
    } catch (err) {
        console.log('Error at dbHandler.js -> query() with pool.connect(): ', err);
    }
};

const batchQuery = async (q, op, args) => {
    try {
        const client = await pool.connect();
        try {
            let rows = 0
            for (let i=0; i<args.length; i++) {
                const result = await client.query(q, args[i]);
                rows += result.rowCount;
            }
            if ((op === 'insert') || (op == 'update')) { await client.query('COMMIT') }
            return rows;
        } catch (err) {
            if ((op === 'insert') || (op == 'update')) { await client.query('ROLLBACK') }
            console.log('Error at queries.js -> query(): ', err, q);
            return 400;
        } finally {
            client.release();
        }
    } catch (err) {
        console.log('Error at dbHandler.js -> query() with pool.connect(): ', err);
    }
};


// TODO: create query for bulk operations reusing the client?

module.exports = {
    query,
    batchQuery,
};
