const https = require('https');
const { getConfig } = require('../../common/configUtil');
const route = getConfig('route');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);

const groStatsCall = () => {
    return new Promise(async (resolve) => {
        try {
            let result = "";

            const options = {
                hostname: route.gro_stats.hostname,
                port: route.gro_stats.port,
                path: route.gro_stats.path,
                method: 'GET'
            };

            const req = https.request(options, (res) => {
                // console.log('statusCode:', res.statusCode);
                // console.log('headers:', res.headers);
                res.on('data', (d) => {
                    result += d;
                }).on('end', () => {
                    resolve(result);
                });
            });

            req.on('error', (err) => {
                logger.error('**DB: Error in groStatsCall.js:', err);
                resolve({});
            });
            req.end();
        } catch (err) {
            logger.error('**DB: Error in groStatsCall.js:', err);
        }
    });
}


module.exports = {
    groStatsCall,
}

