const fs = require('fs');
const config = require('config');

const statsLatest = config.get('stats_latest');

async function getGroStatsContent() {
    const data = fs.readFileSync(statsLatest, { flag: 'a+' });
    const filenameContent = data.toString();
    const content = JSON.parse(filenameContent);
    const { filename } = content;
    const stats = fs.readFileSync(filename, { flag: 'a+' });
    return JSON.parse(stats.toString());
}
module.exports = {
    getGroStatsContent,
};
