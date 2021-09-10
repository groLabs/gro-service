const fs = require('fs');
const moment = require('moment');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../../${botEnv}/${botEnv}Logger`);
const { getConfig } = require('../../common/configUtil');
const statsDir = getConfig('stats_folder');


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
    } catch (err) {
        logger.error('Error in lbpUtil.js->getNetworkId():', err);
    }
};

// Generates the files asynchronously
const generateJSONFile = (data) => {
    try {
        if (data.current_timestamp && data.current_timestamp > 0) {
            const timestamp = data.current_timestamp; 
            const currentFile = `${statsDir}/lbp-${timestamp}.json`;
            const latestFile = `${statsDir}/lbp-latest.json`;
    
            fs.writeFile(currentFile, JSON.stringify(data), (err) => {
                if (err) {
                    logger.error(`**DB: Error in lbpUtil->generateJSONFile() when creating <lbp-${timestamp}.json>: ${err}`);
                } else {
                    fs.writeFile(latestFile, JSON.stringify(data), (err) => {
                        if (err) {
                            logger.error(`**DB: Error in lbpUtil->generateJSONFile() when creating <lbp-latest.json>: ${err}`);
                        } else {
                            logger.info(`**DB: File <lbp-${timestamp}.json> created | File <lbp-latest.json> updated.`);
                        }
                    });
                }
            });
        } else {
            logger.error(`**DB: Error in lbpUtil->generateJSONFile(): wrong JSON data -> ${data}`);
        }
    } catch (err) {
        logger.error(`**DB: Error in lbpUtil->generateJSONFile(): ${err}`);
    }
}

const getJSONFile = () => {
    try {
        logger.info(`**DB: Providing LBP data...`);
        const data = require(`../../../stats/lbp-latest.json`);
        return data;
    } catch (err) {
        logger.error(`**DB: Error in lbpUtil->getJSONFile(): file <${statsDir}/lbp-latest.json> not available`);
        return {
            'error': `file <${statsDir}/lbp-latest.json> not available`
        }
    }
}

module.exports = {
    getNetworkId,
    generateJSONFile,
    getJSONFile,
}

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
            logger.info(`**DB: Providing LBP data from file lbp-${lastTimestamp}.json`);
            const data = require(`../../../stats/lbp-${lastTimestamp}.json`);
            return data;
        } else {
            logger.error(`**DB: No JSON files with LBP data were found in folder <${path}>`);
            return {
                "error": "no JSON files with LBP data available"
            };
        }
    } catch (err) {
        console.log(err);
    }
}
*/