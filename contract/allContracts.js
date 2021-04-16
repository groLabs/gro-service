'use strict';

const { ethers } = require('ethers');
const { getNonceManager } = require('../common/chainUtil');
const { SettingError, ContractCallError } = require('../common/customErrors');
const botEnv = process.env.BOT_ENV.toLowerCase();
const logger = require(`../${botEnv}/${botEnv}Logger`);
const config = require('config');
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
let vaults = [];
let strategyLength = [];

const initAllContracts = async function () {
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
    logger.info(`Init contracts done!.`);
};

const initController = function () {
    if (!config.has('contracts.controller')) {
        const err = new SettingError('Config:abi.controller not setted.');
        logger.error(err);
        throw err;
    }
    const controllerABI = require('./abis/Controller.json').abi;
    const controllerAddress = config.get('contracts.controller');
    controller = new ethers.Contract(
        controllerAddress,
        controllerABI,
        nonceManager
    );
    logger.info('controller done!');
};

const initInsurance = async function () {
    const insuranceABI = require('./abis/Insurance.json').abi;

    const insuranceAddress = await controller.insurance();
    logger.info(`insurance address: ${insuranceAddress}`);
    insurance = new ethers.Contract(
        insuranceAddress,
        insuranceABI,
        nonceManager
    );
    const exposureABI = require('./abis/Exposure.json').abi;
    const exposureAddress = await insurance.exposure();
    logger.info(`exposure address: ${exposureAddress}`);
    exposure = new ethers.Contract(exposureAddress, exposureABI, nonceManager);
};

const initPnl = async function () {
    const pnlABI = require('./abis/PnL.json').abi;
    const pnlAddress = await controller.pnl();
    logger.info(`pnl address: ${pnlAddress}`);
    pnl = new ethers.Contract(pnlAddress, pnlABI, nonceManager);
};

const initVaults = async function () {
    const vaultsABI = require('./abis/VaultAdaptorYearnV2_032.json').abi;

    // Stable coin vault
    const vaultAddresses = await controller.vaults();
    vaultAddresses.forEach(async (address) => {
        let vault = new ethers.Contract(address, vaultsABI, nonceManager);
        vaults.push(vault);
        const strategiesLength = await vault.getStrategiesLength();
        logger.info(`vault ${address} has ${strategiesLength} strategies.`);
        strategyLength.push(strategiesLength);
    });

    // Curve vault
    const curveVaultAddress = await controller.curveVault();
    const curveVault = new ethers.Contract(
        curveVaultAddress,
        vaultsABI,
        nonceManager
    );
    vaults.push(curveVault);
    const curveVaultStrategyLength = await curveVault.getStrategiesLength();
    logger.info(
        `curve vault ${curveVaultAddress} has ${curveVaultStrategyLength} strategies.`
    );
    strategyLength.push(curveVaultStrategyLength);
};

const initCurveVault = async function () {
    const vaultABI = require('./abis/VaultAdaptorYearnV2_032.json').abi;
    const curveVaultAddress = await controller.curveVault();
    logger.info(`curve vault address: ${curveVaultAddress}`);
    curveVault = new ethers.Contract(curveVaultAddress, vaultABI, nonceManager);
};

const renameDuplicatedFactorEntry = function (abi) {
    const keys = abi.keys();
    for (const key of keys) {
        const node = abi[key];
        if (node.name === 'factor' && node.inputs.length > 0) {
            node.name = 'factorWithParam';
        }
    }
    return abi;
};

const initGvt = async function () {
    const gvtABI = require('./abis/NonRebasingGToken.json').abi;
    const gvtAddresses = await controller.gvt();
    logger.info(`gvt address: ${gvtAddresses}`);
    gvt = new ethers.Contract(
        gvtAddresses,
        renameDuplicatedFactorEntry(gvtABI),
        nonceManager
    );
};

const initPwrd = async function () {
    const pwrdABI = require('./abis/RebasingGToken.json').abi;
    const pwrdAddresses = await controller.pwrd();
    logger.info(`pwrd address: ${pwrdAddresses}`);
    pwrd = new ethers.Contract(
        pwrdAddresses,
        renameDuplicatedFactorEntry(pwrdABI),
        nonceManager
    );
};

const initDepositHandler = async function () {
    const depositHandlerABI = require('./abis/DepositHandler.json').abi;
    const depositHandlerAddress = await controller.depositHandler();
    logger.info(`depositHandler address: ${depositHandlerAddress}`);
    depositHandler = new ethers.Contract(
        depositHandlerAddress,
        depositHandlerABI,
        nonceManager
    );
};

const initWithdrawHandler = async function () {
    const withdrawHandlerABI = require('./abis/WithdrawHandler.json').abi;
    const withdrawHandlerAddress = await controller.withdrawHandler();
    logger.info(`withdrawHandler address: ${withdrawHandlerAddress}`);
    withdrawHandler = new ethers.Contract(
        withdrawHandlerAddress,
        withdrawHandlerABI,
        nonceManager
    );
};

const initLifeguard = async function () {
    const lifeguardABI = require('./abis/LifeGuard3Pool.json').abi;
    const lifeguardAddresses = await controller.lifeGuard();
    logger.info(`lifeguard address: ${lifeguardAddresses}`);
    lifeguard = new ethers.Contract(
        lifeguardAddresses,
        lifeguardABI,
        nonceManager
    );
    const buoyABI = require('./abis/Buoy3Pool.json').abi;
    const buoyAddresses = await lifeguard.buoy();
    logger.info(`bouy address: ${buoyAddresses}`);
    buoy = new ethers.Contract(buoyAddresses, buoyABI, nonceManager);
};

const getController = function () {
    return controller;
};

const getInsurance = function () {
    return insurance;
};

const getExposure = function () {
    return exposure;
};

const getVaults = function () {
    return vaults;
};

const getCurveVault = function () {
    return curveVault;
};

const getPnl = function () {
    return pnl;
};

const getGvt = function () {
    return gvt;
};

const getPwrd = function () {
    return pwrd;
};

const getLifeguard = function () {
    return lifeguard;
};

const getStrategyLength = function () {
    return strategyLength;
};

const getDepositHandler = function () {
    return depositHandler;
};

const getWithdrawHandler = function () {
    return withdrawHandler;
};

const getBuoy = function () {
    return buoy;
};

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
