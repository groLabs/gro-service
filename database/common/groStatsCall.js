const https = require('https');

const groStatsCall = () => {
    return new Promise(async (resolve) => {
        try {
            let result = "";

            const options = {
                hostname: 'ajj49or3nh.execute-api.eu-west-2.amazonaws.com',
                port: 443,
                path: '/stats/gro_stats?network=ropsten',
                method: 'GET'
            };

            const req = https.request(options, (res) => {
                console.log('statusCode:', res.statusCode);
                console.log('headers:', res.headers);

                res.on('data', (d) => {
                    result += d;
                }).on('end', () => {
                    resolve(result);
                });
            });

            req.on('error', (e) => {
                resolve({});
            });
            req.end();
        } catch (err) {
            console.log(err);
        }
    });
}


module.exports = {
    groStatsCall,
}

