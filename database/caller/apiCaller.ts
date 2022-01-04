import http from 'http';
import https from 'https';
import { QUERY_ERROR } from '../constants';
import { IApiCall, IApiReturn } from '../interfaces';
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);


const apiCaller = (options: IApiCall): Promise<IApiReturn> => {
    return new Promise(async (resolve) => {
        try {
            let payload = '';

            if (!options.hostname
                || !options.port
                || !options.path) {
                resolve({
                    status: QUERY_ERROR,
                    data: `Connection details not found: [hostname: ${options.hostname}]`
                });
            } else {
                // Use http when bot is running inside AWS VPC and using msb* name; use https otherwise
                const connection = (options.hostname.slice(0, 3) === 'msb')
                    ? http
                    : https;

                const req = connection.request(options, (res) => {
                    res.on('data', (d) => {
                        payload += d;
                    }).on('end', () => {
                        resolve({
                            status: res.statusCode,
                            data: payload,
                        })
                    });
                });

                req.on('error', (err) => {
                    logger.error('**DB: Error in apiCaller.js:', err);
                    resolve({
                        status: QUERY_ERROR,
                        data: err,
                    });
                });

                req.end();
            }
        } catch (err) {
            logger.error('**DB: Error in apiCaller.js:', err);
            resolve({
                status: QUERY_ERROR,
                data: err,
            })
        }
    });
}

export {
    apiCaller,
}

