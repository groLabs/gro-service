"use strict";

const { ethers } = require("ethers");
const { getNonceManager } = require("../common/chainUtil");
const { SettingError } = require("../common/customErrors");
const logger = require("../common/logger");
const config = require("config");
const nonceManager = getNonceManager();

let controller;
let insurance;
let pnl;
let vaults = [];
let strategyLength = [];

const initAllContracts = async function () {
  initController();
  const promises = [];
  promises.push(initInsurance());
  promises.push(initPnl());
  promises.push(initVaults());
  await Promise.all(promises);
  logger.info(`Init contracts done!.`);
};

const initController = function () {
  if (!config.has("abi.controller")) {
    const err = new SettingError("Config:abi.controller not setted.");
    logger.error(err);
    throw err;
  }
  const controllerABI = require("./abis/IController.json").abi;
  const controllerAddress = config.get("abi.controller");
  controller = new ethers.Contract(controllerAddress, controllerABI, nonceManager);
};

const initInsurance = async function () {
  const insuranceABI = require("./abis/IInsurance.json").abi;

  const insuranceAddress = await controller.insurance();
  logger.info(`insurance ${insuranceAddress}`);
  insurance = new ethers.Contract(insuranceAddress, insuranceABI, nonceManager);
};

const initPnl = async function () {
  const pnlABI = require("./abis/IPnL.json").abi;
  const pnlAddress = await controller.pnl();
  logger.info(`pnl ${pnlAddress}`);
  pnl = new ethers.Contract(pnlAddress, pnlABI, nonceManager);
};

const initVaults = async function () {
  const vaultsABI = require("./abis/IVault.json").abi;
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

module.exports = {
  initAllContracts,
  getController,
  getInsurance,
  getVaults,
  getPnl,
  getStrategyLength,
};
