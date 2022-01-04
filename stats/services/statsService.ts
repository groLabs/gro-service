import fs from 'fs';
import config from 'config';
import { loadContractInfoFromRegistry } from '../../dist/registry/registryLoader';
import { reloadData } from '../common/contractStorage';

const statsLatest = config.get('stats_latest') as string;

async function getGroStatsContent() {
    const data = fs.readFileSync(statsLatest, { flag: 'a+' });
    const filenameContent = data.toString();
    const content = JSON.parse(filenameContent);
    const { filename } = content;
    const stats = fs.readFileSync(filename, { flag: 'a+' });
    return JSON.parse(stats.toString());
}

async function getGroStatsMcContent() {
    const data = fs.readFileSync(statsLatest, { flag: 'a+' });
    const filenameContent = data.toString();
    const content = JSON.parse(filenameContent);
    const { mcFilename } = content;
    const stats = fs.readFileSync(mcFilename, { flag: 'a+' });
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

export {
    getGroStatsContent,
    getGroStatsMcContent,
    getArgentStatsContent,
    getExternalStatsContent,
    reloadContractsFromRegistry,
};
