'use strict';

const { ethers } = require('ethers');
const { getNonceManager } = require('../common/chainUtil');
const { SettingError } = require('../common/customErrors');
const logger = require('../common/logger');
const config = require('config');
const nonceManager = getNonceManager();

let controller;
let insurance;
let pnl;
let groVault;
let powerD;
let depositHandler;
let withdrawHandler;
let vaults = [];
let strategyLength = [];

const initAllContracts = async function () {
    initController();
    const promises = [];
    promises.push(initInsurance());
    promises.push(initPnl());
    promises.push(initVaults());
    promises.push(initGroVaultToken());
    promises.push(initPowerDToken());
    promises.push(initDepositHandler());
    promises.push(initWithdrawHandler());
    await Promise.all(promises);
    logger.info(`Init contracts done!.`);
};

const initController = function () {
    if (!config.has('contracts.controller')) {
        const err = new SettingError('Config:contracts.controller not setted.');
        logger.error(err);
        throw err;
    }
    const controllerABI = require('./abis/IController.json').abi;
    const controllerAddress = config.get('contracts.controller');
    controller = new ethers.Contract(
        controllerAddress,
        controllerABI,
        nonceManager
    );
    logger.info('controller done!');
};

const initInsurance = async function () {
    const insuranceABI = require('./abis/IInsurance.json').abi;

    const insuranceAddress = await controller.insurance();
    logger.info(`insurance ${insuranceAddress}`);
    insurance = new ethers.Contract(
        insuranceAddress,
        insuranceABI,
        nonceManager
    );
};

const initPnl = async function () {
    const pnlABI = require('./abis/IPnL.json').abi;
    const pnlAddress = await controller.pnl();
    logger.info(`pnl ${pnlAddress}`);
    pnl = new ethers.Contract(pnlAddress, pnlABI, nonceManager);
};

const initVaults = async function () {
    const vaultsABI = require('./abis/IVault.json').abi;
    const vaultAddresses = await controller.vaults();
    let strategies = [];
    vaultAddresses.forEach((address) => {
        let vault = new ethers.Contract(address, vaultsABI, nonceManager);
        logger.info(`vault ${address}`);
        vaults.push(vault);
        strategies.push(vault.getStrategiesLength());
    });
    strategyLength = await Promise.all(strategies);
};

const initGroVaultToken = async function () {
    const groVaultABI = require('./abis/NonRebasingGToken.json').abi;
    const groVaultAddress = await controller.gvt();
    logger.info(`groVault ${groVaultAddress}`);
    groVault = new ethers.Contract(groVaultAddress, groVaultABI, nonceManager);
};

const initPowerDToken = async function () {
    const powerDABI = require('./abis/RebasingGToken.json').abi;
    const powerDAddress = await controller.pwrd();
    logger.info(`powerD ${powerDAddress}`);
    powerD = new ethers.Contract(powerDAddress, powerDABI, nonceManager);
};

const initDepositHandler = async function () {
    const depositHandlerABI = require('./abis/DepositHandler.json').abi;
    const depositHandlerAddress = await controller.depositHandler();
    logger.info(`depositHandler ${depositHandlerAddress}`);
    depositHandler = new ethers.Contract(
        depositHandlerAddress,
        depositHandlerABI,
        nonceManager
    );
};

const initWithdrawHandler = async function () {
    const withdrawHandlerABI = require('./abis/WithdrawHandler.json').abi;
    const withdrawHandlerAddress = await controller.withdrawHandler();
    logger.info(`withdrawHandler ${withdrawHandlerAddress}`);
    withdrawHandler = new ethers.Contract(
        withdrawHandlerAddress,
        withdrawHandlerABI,
        nonceManager
    );
};

const getController = function () {
    return controller;
};

const getInsurance = function () {
    return insurance;
};

const getVaults = function () {
    return vaults;
};

const getPnl = function () {
    return pnl;
};

const getStrategyLength = function () {
    return strategyLength;
};

const getGroVault = function () {
    return groVault;
};

const getPowerD = function () {
    return powerD;
};

const getDepositHandler = function () {
    return depositHandler;
};

const getWithdrawHandler = function () {
    return withdrawHandler;
};

module.exports = {
    initAllContracts,
    getController,
    getInsurance,
    getVaults,
    getPnl,
    getStrategyLength,
    getGroVault,
    getPowerD,
    getDepositHandler,
    getWithdrawHandler,
};
