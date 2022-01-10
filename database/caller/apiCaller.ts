import http from 'http';
import https from 'https';
import { errorObj } from '../common/globalUtil';
import { ICall, ICallInfo } from '../interfaces/ICall';
import { showError } from '../handler/logHandler';
import { QUERY_SUCCESS } from '../constants';

const apiCaller = (options: ICallInfo): Promise<ICall> => {
    return new Promise(async (resolve) => {
        try {
            let payload = '';

            if (!options.hostname
                || !options.port
                || !options.path) {
                resolve(errorObj(`Connection details not found: ${options}`));
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
                            //status: res.statusCode,
                            status: QUERY_SUCCESS,
                            data: payload,
                        })
                    });
                });

                req.on('error', (err) => {
                    showError('apiCaller.ts->apiCaller()', err);
                    resolve(errorObj(`Error while reading connection request: ${err}`));
                });

                req.end();
            }
        } catch (err) {
            showError('apiCaller.ts->apiCaller()', err);
            resolve(errorObj(`Error in apiCaller: ${err}`));
        }
    });
}

export {
    apiCaller,
}

