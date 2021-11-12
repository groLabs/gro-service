// @ts-nocheck
import { ethers } from 'ethers';
import { getAlchemyRpcProvider, getWalletNonceManager } from '../common/chainUtil';
import { ContractCallError } from '../common/error';
import { getConfig } from '../common/configUtil';

const botEnv = process.env.BOT_ENV?.toLowerCase();
const nodeEnv = process.env.NODE_ENV?.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
const controllerABI = require('./abis/Controller.json');
// const controllerABI = require((nodeEnv === 'mainnet')
//     ? './abis/Controller.json'
//     : './abis/Controller-old.json'
// );
const insuranceABI = require('./abis/Insurance.json');
const exposureABI = require('./abis/Exposure.json');
const pnlABI = require('./abis/PnL.json');
const vaultAdapterABI = require('./abis/VaultAdaptorYearnV2_032.json');
const gvtABI = require('./abis/NonRebasingGToken.json');
const pwrdABI = require('./abis/RebasingGToken.json');
const depositHandlerABI = require('./abis/DepositHandler.json');
const withdrawHandlerABI = require('./abis/WithdrawHandler.json');
// const depositHandlerABI = require((nodeEnv === 'mainnet')
//     ? '../contract/abis/DepositHandler-old.json'
//     : '../contract/abis/DepositHandler.json'
// );
// const withdrawHandlerABI = require((nodeEnv === 'mainnet')
//     ? '../contract/abis/WithdrawHandler-old.json'
//     : '../contract/abis/WithdrawHandler.json'
// );
const lifeguardABI = require('./abis/LifeGuard3Pool.json');
const buoyABI = require('./abis/Buoy3Pool.json');
const VaultABI = require('./abis/Vault.json');
const erc20ABI = require('./abis/ERC20.json');
const strategyABI = require('./abis/Strategy.json');

const nonceManager = getWalletNonceManager();

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
const underlyTokens = [];
const strategyLength = [];
const vaultAndStrategyLabels = {};
const vaultStableCoins = { tokens: {}, decimals: {}, symbols: {} };
const yearnVaults = [];
const providerConnectedContracts = {};
const managerConnectedContracts = {};

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
    strategyNameConfig = 'strategy_name',
    strategyDisplayNameConfig = 'strategy_display_name'
) {
    const yearnVaultAddress = await vaultAdapter.vault();
    const strategyName = getConfig(strategyNameConfig);
    const strategyDisplayName = getConfig(strategyDisplayNameConfig);
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
    yearnVaults.push(yearnVault);
    const strategiesAddressesPromise = [];
    for (let i = 0; i < strategyLength; i += 1) {
        strategiesAddressesPromise.push(yearnVault.withdrawalQueue(i));
    }
    const strategyAddresses = await Promise.all(strategiesAddressesPromise);

    for (let j = 0; j < strategyLength; j += 1) {
        vaultAndStrategyLabels[vaultAdapter.address].strategies.push({
            name: strategyName[adapterIndex * 2 + j],
            displayName: strategyDisplayName[adapterIndex * 2 + j],
            address: strategyAddresses[j],
            strategy: new ethers.Contract(
                strategyAddresses[j],
                strategyABI,
                nonceManager
            ),
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
    await initVaultStrategyLabel(3, tcurveVault, curveVaultStrategyLength);
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
    const symbio = await gvt.symbol();
    const decimals = await gvt.decimals();
    vaultStableCoins.decimals[gvtAddresses] = decimals.toString();
    vaultStableCoins.symbols[gvtAddresses] = symbio;
}

async function initPwrd() {
    const pwrdAddresses = await controller.pwrd();
    logger.info(`pwrd address: ${pwrdAddresses}`);
    pwrd = new ethers.Contract(
        pwrdAddresses,
        renameDuplicatedFactorEntry(pwrdABI),
        nonceManager
    );
    const symbio = await pwrd.symbol();
    const decimals = await pwrd.decimals();
    vaultStableCoins.decimals[pwrdAddresses] = decimals.toString();
    vaultStableCoins.symbols[pwrdAddresses] = symbio;
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

async function initVaultStableCoins() {
    const lastIndex = vaults.length - 1;
    if (lastIndex < 0) return;
    vaultStableCoins.tokens[vaults[lastIndex].address] = [];
    for (let i = 0; i < lastIndex; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const token = await vaults[i].token();
        vaultStableCoins.tokens[vaults[i].address] = [token];
        vaultStableCoins.tokens[vaults[lastIndex].address].push(token);
        const stableCoin = new ethers.Contract(token, erc20ABI, nonceManager);
        underlyTokens.push(stableCoin);
        // eslint-disable-next-line no-await-in-loop
        const decimals = await stableCoin.decimals();
        // eslint-disable-next-line no-await-in-loop
        const symbio = await stableCoin.symbol();
        vaultStableCoins.decimals[token] = decimals.toString();
        vaultStableCoins.symbols[token] = symbio;
    }
    logger.info(`Vault's stable coins: ${JSON.stringify(vaultStableCoins)}`);
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
    // logger.info(
    //     `Vault and strategy label: ${JSON.stringify(vaultAndStrategyLabels)}`
    // );

    await initVaultStableCoins().catch((error) => {
        logger.error(error);
        throw new ContractCallError("Initilize vaults' stable coins failed");
    });
    logger.info('Init contracts done!.');
}

async function initDatabaseContracts() {
    initController();
    const promises = [];
    promises.push(initGvt());
    promises.push(initPwrd());
    promises.push(initDepositHandler());
    promises.push(initWithdrawHandler());
    await Promise.all(promises).catch((error) => {
        logger.error(error);
        throw new ContractCallError('Initilize all used contracts failed');
    });
    logger.info('Init contracts done!.');
}

function getOrCreateContract(
    contractInsurance,
    contractKey,
    providerKey,
    signerKey
) {
    let contract;
    if (signerKey) {
        if (!managerConnectedContracts[providerKey]) {
            managerConnectedContracts[providerKey] = {};
        }
        const providerContracts = managerConnectedContracts[providerKey];
        if (!providerContracts[signerKey]) {
            providerContracts[signerKey] = {};
        }
        contract = providerContracts[signerKey][contractKey];
        if (!contract) {
            const wallet = getWalletNonceManager(providerKey, signerKey);
            contract = contractInsurance.connect(wallet);
            providerContracts[signerKey][contractKey] = contract;
        }
    } else {
        if (!providerConnectedContracts[providerKey]) {
            providerConnectedContracts[providerKey] = {};
        }
        const contracts = providerConnectedContracts[providerKey];
        contract = contracts[contractKey];
        if (!contract) {
            const provider = getAlchemyRpcProvider(providerKey);
            contract = contractInsurance.connect(provider);
            contracts[contractKey] = contract;
        }
    }
    return contract;
}

function getOrCreateContracts(
    contractsInstance,
    contractKey,
    providerKey,
    signerKey
) {
    let distContracts;
    if (signerKey) {
        if (!managerConnectedContracts[providerKey]) {
            managerConnectedContracts[providerKey] = {};
        }
        const providerContracts = managerConnectedContracts[providerKey];
        if (!providerContracts[signerKey]) {
            providerContracts[signerKey] = {};
        }
        distContracts = providerContracts[signerKey][contractKey];
        if (!distContracts) {
            distContracts = [];
            const wallet = getWalletNonceManager(providerKey, signerKey);
            for (let i = 0; i < contractsInstance.length; i += 1) {
                distContracts.push(contractsInstance[i].connect(wallet));
            }
            providerContracts[signerKey][contractKey] = distContracts;
        }
    } else {
        if (!providerConnectedContracts[providerKey]) {
            providerConnectedContracts[providerKey] = {};
        }
        const contracts = providerConnectedContracts[providerKey];
        distContracts = contracts[contractKey];
        if (!distContracts) {
            distContracts = [];
            const provider = getAlchemyRpcProvider(providerKey);
            for (let i = 0; i < contractsInstance.length; i += 1) {
                distContracts.push(contractsInstance[i].connect(provider));
            }
            contracts[contractKey] = distContracts;
        }
    }
    return distContracts;
}

function getController(providerKey, signerKey) {
    if (!providerKey) return controller;
    return getOrCreateContract(
        controller,
        'controller',
        providerKey,
        signerKey
    );
}

function getInsurance(providerKey, signerKey) {
    if (!providerKey) return insurance;
    return getOrCreateContract(insurance, 'insurance', providerKey, signerKey);
}

function getExposure(providerKey, signerKey) {
    if (!providerKey) return exposure;
    return getOrCreateContract(exposure, 'exposure', providerKey, signerKey);
}

function getVaults(providerKey, signerKey) {
    if (!providerKey) return vaults;
    return getOrCreateContracts(vaults, 'vaults', providerKey, signerKey);
}

function getCurveVault(providerKey, signerKey) {
    if (!providerKey) return curveVault;
    return getOrCreateContract(
        curveVault,
        'curveVault',
        providerKey,
        signerKey
    );
}

function getPnl(providerKey, signerKey) {
    if (!providerKey) return pnl;
    return getOrCreateContract(pnl, 'pnl', providerKey, signerKey);
}

function getGvt(providerKey, signerKey) {
    if (!providerKey) return gvt;
    return getOrCreateContract(gvt, 'gvt', providerKey, signerKey);
}

function getPwrd(providerKey, signerKey) {
    if (!providerKey) return pwrd;
    return getOrCreateContract(pwrd, 'pwrd', providerKey, signerKey);
}

function getLifeguard(providerKey, signerKey) {
    if (!providerKey) return lifeguard;
    return getOrCreateContract(lifeguard, 'lifeguard', providerKey, signerKey);
}

function getStrategyLength() {
    return strategyLength;
}

function getDepositHandler(providerKey, signerKey) {
    if (!providerKey) return depositHandler;
    return getOrCreateContract(
        depositHandler,
        'depositHandler',
        providerKey,
        signerKey
    );
}

function getWithdrawHandler(providerKey, signerKey) {
    if (!providerKey) return withdrawHandler;
    return getOrCreateContract(
        withdrawHandler,
        'withdrawHandler',
        providerKey,
        signerKey
    );
}

function getBuoy(providerKey?, signerKey?) {
    if (!providerKey) return buoy;
    return getOrCreateContract(buoy, 'buoy', providerKey, signerKey);
}

function getVaultAndStrategyLabels() {
    return vaultAndStrategyLabels;
}

function getVaultStableCoins() {
    return vaultStableCoins;
}

function getUnderlyTokens(providerKey, signerKey) {
    if (!providerKey) return underlyTokens;
    return getOrCreateContracts(
        underlyTokens,
        'underlyTokens',
        providerKey,
        signerKey
    );
}

function getYearnVaults(providerKey, signerKey) {
    if (!providerKey) return yearnVaults;
    return getOrCreateContracts(
        yearnVaults,
        'yearnVaults',
        providerKey,
        signerKey
    );
}

export {
    initAllContracts,
    initDatabaseContracts,
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
    getVaultStableCoins,
    getUnderlyTokens,
    getYearnVaults,
};
