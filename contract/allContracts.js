const { ethers } = require('ethers');
const { getNonceManager } = require('../common/chainUtil');
const { ContractCallError } = require('../common/error');
const { getConfig } = require('../common/configUtil');

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
const controllerABI = require('./abis/Controller.json');
const insuranceABI = require('./abis/Insurance.json');
const exposureABI = require('./abis/Exposure.json');
const pnlABI = require('./abis/PnL.json');
const vaultAdapterABI = require('./abis/VaultAdaptorYearnV2_032.json');
const gvtABI = require('./abis/NonRebasingGToken.json');
const pwrdABI = require('./abis/RebasingGToken.json');
const depositHandlerABI = require('./abis/DepositHandler.json');
const withdrawHandlerABI = require('./abis/WithdrawHandler.json');
const lifeguardABI = require('./abis/LifeGuard3Pool.json');
const buoyABI = require('./abis/Buoy3Pool.json');
const VaultABI = require('./abis/Vault.json');
const chainPriceABI = require('./abis/ChainPrice.json');

const nonceManager = getNonceManager();

let controller;
let insurance;
let exposure;
let pnl;
let gvt;
let pwrd;
let depositHandler;
let withdrawHandler;
let lifeguard;
let buoy;
let curveVault;
let chainPrice;
const vaults = [];
const strategyLength = [];
const vaultAndStrategyLabels = {};

function initController() {
    const controllerAddress = getConfig('contracts.controller');
    controller = new ethers.Contract(
        controllerAddress,
        controllerABI,
        nonceManager
    );
    logger.info('controller done!');
}

async function initInsurance() {
    const insuranceAddress = await controller.insurance();
    logger.info(`insurance address: ${insuranceAddress}`);
    insurance = new ethers.Contract(
        insuranceAddress,
        insuranceABI,
        nonceManager
    );

    const exposureAddress = await insurance.exposure();
    logger.info(`exposure address: ${exposureAddress}`);
    exposure = new ethers.Contract(exposureAddress, exposureABI, nonceManager);
}

async function initPnl() {
    const pnlAddress = await controller.pnl();
    logger.info(`pnl address: ${pnlAddress}`);
    pnl = new ethers.Contract(pnlAddress, pnlABI, nonceManager);
}

async function initVaultStrategyLabel(
    adapterIndex,
    vaultAdapter,
    strategyLength,
    vaultNameConfig = 'vault_name',
    strategyNameConfig = 'strategy_name'
) {
    const yearnVaultAddress = await vaultAdapter.vault();
    const strategyName = getConfig(strategyNameConfig);
    const vaultName = getConfig(vaultNameConfig);
    logger.info(
        `adapterIndex: ${adapterIndex}, strategyLength: ${strategyLength}`
    );
    vaultAndStrategyLabels[vaultAdapter.address] = {
        address: vaultAdapter.address,
        name: vaultName[adapterIndex],
        strategies: [],
    };
    const yearnVault = new ethers.Contract(
        yearnVaultAddress,
        VaultABI,
        nonceManager
    );
    const strategiesAddressesPromise = [];
    for (let i = 0; i < strategyLength; i += 1) {
        strategiesAddressesPromise.push(yearnVault.withdrawalQueue(i));
    }
    const strategyAddresses = await Promise.all(strategiesAddressesPromise);
    for (let j = 0; j < strategyLength; j += 1) {
        vaultAndStrategyLabels[vaultAdapter.address].strategies.push({
            name: strategyName[j],
            address: strategyAddresses[j],
        });
    }
}

async function initVaults() {
    // Stable coin vault
    const vaultAddresses = await controller.vaults();
    logger.info(
        `vaultAddresses.length: ${vaultAddresses.length}: ${JSON.stringify(
            vaultAddresses
        )}`
    );
    for (let i = 0; i < vaultAddresses.length; i += 1) {
        const address = vaultAddresses[i];
        const vault = new ethers.Contract(
            address,
            vaultAdapterABI,
            nonceManager
        );
        vaults.push(vault);
        // eslint-disable-next-line no-await-in-loop
        const strategiesLength = await vault.getStrategiesLength();
        logger.info(`vault ${address} has ${strategiesLength} strategies.`);
        strategyLength.push(strategiesLength);
        // eslint-disable-next-line no-await-in-loop
        await initVaultStrategyLabel(i, vault, strategiesLength);
    }

    // Curve vault
    const curveVaultAddress = await controller.curveVault();
    const tcurveVault = new ethers.Contract(
        curveVaultAddress,
        vaultAdapterABI,
        nonceManager
    );
    vaults.push(tcurveVault);
    const curveVaultStrategyLength = await tcurveVault.getStrategiesLength();
    logger.info(
        `curve vault ${curveVaultAddress} has ${curveVaultStrategyLength} strategies.`
    );
    strategyLength.push(curveVaultStrategyLength);
    await initVaultStrategyLabel(
        3,
        tcurveVault,
        curveVaultStrategyLength,
        'vault_name',
        'curve_strategy_name'
    );
}

async function initCurveVault() {
    const curveVaultAddress = await controller.curveVault();
    logger.info(`curve vault address: ${curveVaultAddress}`);
    curveVault = new ethers.Contract(
        curveVaultAddress,
        vaultAdapterABI,
        nonceManager
    );
}

function renameDuplicatedFactorEntry(abi) {
    const keys = abi.keys();
    // eslint-disable-next-line no-restricted-syntax
    for (const key of keys) {
        const node = abi[key];
        if (node.name === 'factor' && node.inputs.length > 0) {
            node.name = 'factorWithParam';
        }
    }
    return abi;
}

async function initGvt() {
    const gvtAddresses = await controller.gvt();
    logger.info(`gvt address: ${gvtAddresses}`);
    gvt = new ethers.Contract(
        gvtAddresses,
        renameDuplicatedFactorEntry(gvtABI),
        nonceManager
    );
}

async function initPwrd() {
    const pwrdAddresses = await controller.pwrd();
    logger.info(`pwrd address: ${pwrdAddresses}`);
    pwrd = new ethers.Contract(
        pwrdAddresses,
        renameDuplicatedFactorEntry(pwrdABI),
        nonceManager
    );
}

async function initDepositHandler() {
    const depositHandlerAddress = await controller.depositHandler();
    logger.info(`depositHandler address: ${depositHandlerAddress}`);
    depositHandler = new ethers.Contract(
        depositHandlerAddress,
        depositHandlerABI,
        nonceManager
    );
}

async function initWithdrawHandler() {
    const withdrawHandlerAddress = await controller.withdrawHandler();
    logger.info(`withdrawHandler address: ${withdrawHandlerAddress}`);
    withdrawHandler = new ethers.Contract(
        withdrawHandlerAddress,
        withdrawHandlerABI,
        nonceManager
    );
}

async function initLifeguard() {
    const lifeguardAddresses = await controller.lifeGuard();
    logger.info(`lifeguard address: ${lifeguardAddresses}`);
    lifeguard = new ethers.Contract(
        lifeguardAddresses,
        lifeguardABI,
        nonceManager
    );

    const buoyAddresses = await lifeguard.buoy();
    logger.info(`bouy address: ${buoyAddresses}`);
    buoy = new ethers.Contract(buoyAddresses, buoyABI, nonceManager);

    const chainPriceAddress = await buoy.chainOracle();
    chainPrice = new ethers.Contract(
        chainPriceAddress,
        chainPriceABI,
        nonceManager
    );
    logger.info(`chainPrice address: ${chainPriceAddress}`);
}

async function initAllContracts() {
    initController();
    const promises = [];
    promises.push(initInsurance());
    promises.push(initPnl());
    promises.push(initVaults());
    promises.push(initCurveVault());
    promises.push(initGvt());
    promises.push(initPwrd());
    promises.push(initLifeguard());
    promises.push(initDepositHandler());
    promises.push(initWithdrawHandler());
    await Promise.all(promises).catch((error) => {
        logger.error(error);
        throw new ContractCallError('Initilize all used contracts failed');
    });
    logger.info(
        `Vault and strategy label: ${JSON.stringify(vaultAndStrategyLabels)}`
    );

    logger.info('Init contracts done!.');
}

function getController() {
    return controller;
}

function getInsurance() {
    return insurance;
}

function getExposure() {
    return exposure;
}

function getVaults() {
    return vaults;
}

function getCurveVault() {
    return curveVault;
}

function getPnl() {
    return pnl;
}

function getGvt() {
    return gvt;
}

function getPwrd() {
    return pwrd;
}

function getLifeguard() {
    return lifeguard;
}

function getStrategyLength() {
    return strategyLength;
}

function getDepositHandler() {
    return depositHandler;
}

function getWithdrawHandler() {
    return withdrawHandler;
}

function getBuoy() {
    return buoy;
}

function getVaultAndStrategyLabels() {
    return vaultAndStrategyLabels;
}

function getChainPrice() {
    return chainPrice;
}

module.exports = {
    initAllContracts,
    getController,
    getInsurance,
    getExposure,
    getVaults,
    getCurveVault,
    getPnl,
    getGvt,
    getPwrd,
    getDepositHandler,
    getWithdrawHandler,
    getLifeguard,
    getStrategyLength,
    getBuoy,
    getVaultAndStrategyLabels,
    getChainPrice,
};
