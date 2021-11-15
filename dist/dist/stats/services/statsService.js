const fs = require('fs');
const config = require('config');
const { loadContractInfoFromRegistry, } = require('../../dist/registry/registryLoader');
const { reloadData } = require('../common/contractStorage');
const statsLatest = config.get('stats_latest');
async function getGroStatsContent() {
    const data = fs.readFileSync(statsLatest, { flag: 'a+' });
    const filenameContent = data.toString();
    const content = JSON.parse(filenameContent);
    const { filename } = content;
    const stats = fs.readFileSync(filename, { flag: 'a+' });
    return JSON.parse(stats.toString());
}
async function getArgentStatsContent() {
    const data = fs.readFileSync(statsLatest, { flag: 'a+' });
    const filenameContent = data.toString();
    const content = JSON.parse(filenameContent);
    const { argentFilename } = content;
    const stats = fs.readFileSync(argentFilename, { flag: 'a+' });
    return JSON.parse(stats.toString());
}
async function getExternalStatsContent() {
    const data = fs.readFileSync(statsLatest, { flag: 'a+' });
    const filenameContent = data.toString();
    const content = JSON.parse(filenameContent);
    const { externalFilename } = content;
    const stats = fs.readFileSync(externalFilename, { flag: 'a+' });
    return JSON.parse(stats.toString());
}
async function reloadContractsFromRegistry(providerKey) {
    await loadContractInfoFromRegistry();
    await reloadData(providerKey);
    return { result: 'Reload registry done!.' };
}
module.exports = {
    getGroStatsContent,
    getArgentStatsContent,
    getExternalStatsContent,
    reloadContractsFromRegistry,
};
