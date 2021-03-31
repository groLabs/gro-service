'use strict';

const fs = require('fs');
const config = require('config');
const statsLatest = config.get('stats_latest');

const getGroStatsContent = async function () {
    const data = fs.readFileSync(statsLatest, { flag: 'a+' });
    const filenameContent = data.toString();
    const content = JSON.parse(filenameContent);
    const filename = content.filename;
    console.log(filename);
    const stats = fs.readFileSync(filename, { flag: 'a+' });
    return JSON.parse(stats.toString());
};
module.exports = {
    getGroStatsContent,
};
