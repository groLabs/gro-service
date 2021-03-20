'use strict';

const { ethers } = require('ethers');
const { getNonceManager } = require('../../common/web3tool');
const { SettingError } = require('../../common/customErrors');
const logger = require('../../common/logger');

const vaultABI = require('../../abis/IVault.json').abi;
const nonceManager = getNonceManager();

const strategiesLength = async function (vaultAddress) {
    const vault = new ethers.Contract(vaultAddress, vaultABI, nonceManager);
    const length = await vault.getStrategiesLength().catch((error) => {
        logger.error(error);
        return 0;
    });
    return length;
};

const strategyHarvestTrigger = async function (
    vaultAddress,
    strategyIndex,
    callCost
) {
    const vault = new ethers.Contract(vaultAddress, vaultABI, nonceManager);
    const harvestTriggerResult = await vault
        .strategyHarvestTrigger(strategyIndex, callCost)
        .catch((error) => {
            logger.error(error);
            return false;
        });
    return harvestTriggerResult;
};

const strategyHarvest = async function (vaultAddress, strategyIndex, callCost) {
    const vault = new ethers.Contract(vaultAddress, vaultABI, nonceManager);
    const harvestResult = await vault
        .strategyHarvest(strategyIndex, callCost)
        .catch((error) => {
            logger.error(error);
            return false;
        });
    return harvestResult;
};

module.exports = {
    strategiesLength,
    strategyHarvestTrigger,
    strategyHarvest,
};
