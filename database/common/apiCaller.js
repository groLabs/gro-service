const http = require('http');
const https = require('https');
const { getConfig } = require('../../common/configUtil');
const route = getConfig('route');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);


const apiCaller = (options) => {
    return new Promise(async (resolve) => {
        try {
            let payload = "";
            let result;

            if (!options.hostname || !options.port || !options.path) {
                resolve({
                    status: 400,
                    data: `Connection details not found: [hostname: ${options.hostname}]`
                });
            } else {
                // Use http when bot is running inside AWS VPC; use https otherwise
                const connection = (options.hostname.slice(0, 3) === 'msb')
                    ? http
                    : https;

                const req = connection.request(options, (res) => {
                    res.on('data', (d) => {
                        payload += d;
                    }).on('end', () => {
                        result = {
                            status: res.statusCode,
                            data: payload,
                        };
                        resolve(result);
                    });
                });

                req.on('error', (err) => {
                    logger.error('**DB: Error in apiCaller.js:', err);
                    resolve({
                        status: 400,
                        data: err,
                    });
                });

                req.end();
            }
        } catch (err) {
            logger.error('**DB: Error in apiCaller.js:', err);
        }
    });
}

module.exports = {
    apiCaller,
}

