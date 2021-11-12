const fs = require('fs');
const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { getConfig } = require('../../common/configUtil');
const statsDir = getConfig('stats_folder');
const isFormatOK = (stats) => {
    // Check timestamp JSON fields
    if (!stats.price.timestamp
        || stats.price.timestamp <= 0
        || !stats.balance.timestamp
        || stats.balance.timestamp <= 0) {
        logger.error(`**LBP: Error in lbpUtil.js->isFormatOK(): wrong JSON format from data sourcing: ${stats}`);
        throw 'Data not loaded into LBP_BALANCER_V1';
    }
    else {
        return true;
    }
};
const isLengthOK = (data) => {
    if (data && data.length === 8) {
        return true;
    }
    else {
        logger.error(`**LBP: Error in lbpUtil.js->isLengthOK(): wrong number of values after JSON parsing: ${data}`);
        return false;
    }
};
const isCurrentTimestampOK = (data) => {
    return (data.lbp_stats.current_timestamp && data.lbp_stats.current_timestamp > 0)
        ? true
        : false;
};
const getNetworkId = () => {
    try {
        switch (process.env.NODE_ENV.toLowerCase()) {
            case 'mainnet':
                return 1;
            case 'ropsten':
                return 3;
            case 'rinkeby':
                return 4;
            case 'kovan':
                return 42;
            default:
                return -1;
        }
    }
    catch (err) {
        logger.error('Error in lbpUtil.js->getNetworkId():', err);
    }
};
function fileExists(path) {
    try {
        return fs.statSync(`${statsDir}/lbp-latest.json`).isFile();
    }
    catch (err) {
        // File does not exist
        if (err.code == 'ENOENT') {
            return false;
        }
        // Other errors, e.g.: missing rights
        logger.error(`Error in lbpUtil.js->fileExists() accessing ${path}`, err);
        throw err;
    }
}
const generateJSONFile = (data, latest, hdl) => {
    try {
        if (isCurrentTimestampOK(data)) {
            const timestamp = data.lbp_stats.current_timestamp;
            const currentFile = `${statsDir}/lbp-${timestamp}.json`;
            const latestFile = `${statsDir}/lbp-latest.json`;
            if (!hdl)
                fs.writeFileSync(currentFile, JSON.stringify(data));
            if (latest)
                fs.writeFileSync(latestFile, JSON.stringify(data));
        }
        else {
            logger.error(`**LBP: Error in lbpUtil->generateJSONFile(): wrong JSON data -> ${data}`);
        }
    }
    catch (err) {
        logger.error(`**LBP: Error in lbpUtil->generateJSONFile(): ${err}`);
    }
};
// to provide JSON data to the FE
const getJSONFile = () => {
    try {
        let rawdata = fs.readFileSync(`${statsDir}/lbp-latest.json`);
        let data = JSON.parse(rawdata);
        if (isCurrentTimestampOK(data)) {
            const timestamp = data.lbp_stats.current_timestamp;
            const date = moment.unix(timestamp).format('DD/MM/YYYY HH:mm:ss');
            const price = data.lbp_stats.gro_price_current;
            const balance = data.lbp_stats.gro_amount_current;
            logger.info(`**LBP: Providing LBP data via API (price: ${price}, balance: ${balance}, date: ${date} ${timestamp})`);
            return data;
        }
        else {
            logger.error(`**LBP: lbpUtil->getJSONFile(): wrong JSON data -> ${data}`);
            return {
                'message': `Wrong JSON data`
            };
        }
    }
    catch (err) {
        logger.error(`**LBP: Error in lbpUtil->getJSONFile() when reading from file <${statsDir}/lbp-latest.json> : ${err}`);
        return {
            'message': `file <${statsDir}/lbp-latest.json> not available`
        };
    }
};
module.exports = {
    isFormatOK,
    isLengthOK,
    isCurrentTimestampOK,
    getNetworkId,
    fileExists,
    generateJSONFile,
    getJSONFile,
};
/*
// Replaced by providing the latest file
const findFile = (path, extension) => {
    try {
        // List of all JSON files in /stats
        let lastTimestamp = 0;
        let input = fs.readdirSync(path);
        const files = input.filter(file => file.match(new RegExp(`llbp.*\.(${extension})$`, 'ig')));
        console.log('files:', files);

        // Find the file with latest timestamp
        for (const file of files) {
            const currentTimestamp = file.substring(4, 14);
            if (currentTimestamp > lastTimestamp)
                lastTimestamp = currentTimestamp;
        }

        // Return the latest file
        if (lastTimestamp > 0) {
            logger.info(`**LBP: Providing LBP data from file lbp-${lastTimestamp}.json`);
            const data = require(`../../../stats/lbp-${lastTimestamp}.json`);
            return data;
        } else {
            logger.error(`**LBP: No JSON files with LBP data were found in folder <${path}>`);
            return {
                "error": "no JSON files with LBP data available"
            };
        }
    } catch (err) {
        console.log(err);
    }
}
*/
