const config = require('config');
const { ethers } = require('ethers');
const { getNonceManager } = require('../common/chainUtil');
const { SettingError, ContractCallError } = require('../common/error');

const botEnv = process.env.BOT_ENV.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
const controllerABI = require('./abis/Controller.json').abi;
const insuranceABI = require('./abis/Insurance.json').abi;
const exposureABI = require('./abis/Exposure.json').abi;
const pnlABI = require('./abis/PnL.json').abi;
const vaultsABI = require('./abis/VaultAdaptorYearnV2_032.json').abi;
const gvtABI = require('./abis/NonRebasingGToken.json').abi;
const pwrdABI = require('./abis/RebasingGToken.json').abi;
const depositHandlerABI = require('./abis/DepositHandler.json').abi;
const withdrawHandlerABI = require('./abis/WithdrawHandler.json').abi;
const lifeguardABI = require('./abis/LifeGuard3Pool.json').abi;
const buoyABI = require('./abis/Buoy3Pool.json').abi;

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
const vaults = [];
const strategyLength = [];

function initController() {
    if (!config.has('contracts.controller')) {
        const err = new SettingError('Config:abi.controller not setted.');
        logger.error(err);
        throw err;
    }
    const controllerAddress = config.get('contracts.controller');
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

async function initVaults() {
    // Stable coin vault
    const vaultAddresses = await controller.vaults();
    vaultAddresses.forEach(async (address) => {
        const vault = new ethers.Contract(address, vaultsABI, nonceManager);
        vaults.push(vault);
        const strategiesLength = await vault.getStrategiesLength();
        logger.info(`vault ${address} has ${strategiesLength} strategies.`);
        strategyLength.push(strategiesLength);
    });

    // Curve vault
    const curveVaultAddress = await controller.curveVault();
    const tcurveVault = new ethers.Contract(
        curveVaultAddress,
        vaultsABI,
        nonceManager
    );
    vaults.push(tcurveVault);
    const curveVaultStrategyLength = await tcurveVault.getStrategiesLength();
    logger.info(
        `curve vault ${curveVaultAddress} has ${curveVaultStrategyLength} strategies.`
    );
    strategyLength.push(curveVaultStrategyLength);
}

async function initCurveVault() {
    const curveVaultAddress = await controller.curveVault();
    logger.info(`curve vault address: ${curveVaultAddress}`);
    curveVault = new ethers.Contract(
        curveVaultAddress,
        vaultsABI,
        nonceManager
    );
}

function renameDuplicatedFactorEntry(abi) {
    const keys = abi.keys();
    for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
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
};
