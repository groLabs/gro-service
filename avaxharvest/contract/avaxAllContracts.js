const { BigNumber, ethers } = require('ethers');
const { getWalletNonceManager } = require('../common/avaxChainUtil');
const { getConfig } = require('../../dist/common/configUtil');

// eslint-disable-next-line import/no-dynamic-require
const logger = require('../avaxharvestLogger');
const vaultAdaptorABI = require('./abi/VaultAdaptorMK2.json').abi;
const strategyABI = require('./abi/AHv2Farmer.json').abi;
const routerABI = require('./abi/JoeRouter02.json').abi;
const wavaxABI = require('./abi/Wavax.json').abi;
const chainlinkABI = require('./abi/Chainlink.json').abi;
const joeABI = require('./abi/IJoe.json');
const crTokenABI = require('./abi/CrToken.json').abi;

const erc20ABI = require('../../contract/abis/ERC20.json');
const providerKey = 'default';
const nonceManager = getWalletNonceManager();

const vaults = [];
let router;
let wavax;
let avaxAggregator;
let joeAggregator;
let crToken;
let joeToken;

function initVaults() {
    const vaultsConfig = getConfig('contracts.vaults');
    for (let i = 0; i < vaultsConfig.length; i += 1) {
        const {
            vault_adaptor: vaultAdaptorAddress,
            strategy,
            stable_coin: stableCoinAddress,
            gas_cost: gasCost,
            wallet_key: walletKey,
            vault_name: vaultName,
            strategy_name: strategyName,
            decimals,
        } = vaultsConfig[i];
        console.log(
            `${vaultAdaptorAddress}, ${strategy}, ${gasCost}, ${stableCoinAddress} ${walletKey} ${vaultName} ${strategyName}`
        );

        const nonceManager = getWalletNonceManager(providerKey, walletKey);
        const vaultAdaptorMK2 = new ethers.Contract(
            vaultAdaptorAddress,
            vaultAdaptorABI,
            nonceManager
        );
        console.log(`vaultAdaptorMK2 ${vaultAdaptorMK2.address}`);

        const stableCoin = new ethers.Contract(
            stableCoinAddress,
            erc20ABI,
            nonceManager
        );
        console.log(`stableCoin ${stableCoin.address}`);

        const ahStrategy = new ethers.Contract(
            strategy,
            strategyABI,
            nonceManager
        );
        console.log(`ahStrategy ${ahStrategy.address}`);

        const vault = {
            stableCoin,
            vaultAdaptorMK2,
            ahStrategy,
            gasCost: BigNumber.from(gasCost),
            vaultName,
            walletKey,
            strategyName,
            decimals: BigNumber.from(10).pow(decimals),
        };

        vaults.push(vault);
        console.log(`check ${vaults[i].vaultAdaptorMK2.address}`);
    }
    logger.info(`vaults done! ${vaults.length}`);
}

function initRouter() {
    const routerConfig = getConfig('contracts.router');
    router = new ethers.Contract(routerConfig, routerABI, nonceManager);
    logger.info('router done!');
}

function initWavax() {
    const wavaxConfig = getConfig('contracts.wavax');
    wavax = new ethers.Contract(wavaxConfig, wavaxABI, nonceManager);
    logger.info('wavax done!');
}

function initAvaxAggregator() {
    const aggregatorConfig = getConfig('contracts.avax_aggregator');
    avaxAggregator = new ethers.Contract(
        aggregatorConfig,
        chainlinkABI,
        nonceManager
    );
    logger.info('avaxAggregator done!');
}

function initJoeToken() {
    const joeConfig = getConfig('contracts.joe');
    joeToken = new ethers.Contract(joeConfig, joeABI, nonceManager);
    logger.info('joeToken done!');
}

// function initJoeAggregator() {
//     const joeConfig = getConfig('contracts.joe_aggregator');
//     joeAggregator = new ethers.Contract(joeConfig, chainlinkABI, nonceManager);
//     logger.info('joeAggregator done!');
// }

function initCrToken() {
    const crConfig = getConfig('contracts.crtoken');
    crToken = new ethers.Contract(crConfig, crTokenABI, nonceManager);
    logger.info('crtoken done!');
}

function initAllAvaxContracts() {
    initVaults();
    initRouter();
    initWavax();
    initAvaxAggregator();
    initCrToken();
    initJoeToken();
    logger.info('Init contracts done!.');
}

function getVaults() {
    return vaults;
}

function getRouter() {
    return router;
}

function getWavax() {
    return wavax;
}

function getAvaxAggregator() {
    return avaxAggregator;
}

function getJoeAggregator() {
    return joeAggregator;
}

function getJoeToken() {
    return joeToken;
}

function getCrToken() {
    return crToken;
}

module.exports = {
    initAllAvaxContracts,
    getVaults,
    getRouter,
    getWavax,
    getAvaxAggregator,
    getJoeToken,
    getCrToken,
};
