"use strict";
const fs = require('fs');
const { getConfig } = require('./configUtil');
const blockNumberFile = getConfig('blockNumberFile');
function getLastBlockNumber(type, default_value_key = 'blockchain.start_block') {
    const data = fs.readFileSync(blockNumberFile, { flag: 'a+' });
    let content = data.toString();
    if (content.length === 0) {
        content = '{}';
    }
    const blockObj = JSON.parse(content);
    return blockObj[type] || getConfig(default_value_key);
}
function updateLastBlockNumber(blockNumber, type) {
    const data = fs.readFileSync(blockNumberFile, { flag: 'a+' });
    let content = data.toString();
    if (content.length === 0) {
        content = '{}';
    }
    const blockObj = JSON.parse(content);
    blockObj[type] = blockNumber + 1;
    fs.writeFileSync(blockNumberFile, JSON.stringify(blockObj));
}
module.exports = {
    getLastBlockNumber,
    updateLastBlockNumber,
};
