import { ethers } from 'ethers';
import { getAlchemyRpcProvider } from '../common/chainUtil';

const botEnv = process.env.BOT_ENV?.toLowerCase();
// eslint-disable-next-line import/no-dynamic-require
const logger = require(`../${botEnv}/${botEnv}Logger`);
const provider = getAlchemyRpcProvider();
const controllerABI = require('./abis/Controller.json');
const pnlABI = require('./abis/PnL.json');
const depositHandlerABI = require('./abis/DepositHandler.json');
const withdrawHandlerABI = require('./abis/WithdrawHandler.json');

async function getDeployedContracts(controllerAddress) {
    const controller = new ethers.Contract(
        controllerAddress,
        controllerABI,
        provider
    );

    // stable coins
    const stableCoinAddresses = await controller.stablecoins();
    for (let i = 0; i < stableCoinAddresses.length; i += 1) {
        logger.info(`Stable coin ${i + 1} : ${stableCoinAddresses[i]}`);
    }

    // vault adapter
    const vaultAddresses = await controller.vaults();
    for (let i = 0; i < vaultAddresses.length; i += 1) {
        logger.info(`Vault adapter ${i + 1} : ${vaultAddresses[i]}`);
    }
    const curveVaultAddress = await controller.curveVault();
    logger.info(`Curve vault adapter : ${curveVaultAddress}`);

    // pnl
    const pnlAddress = await controller.pnl();
    logger.info(`pnl : ${pnlAddress}`);
    const pnl = new ethers.Contract(pnlAddress, pnlABI, provider);

    // pnl's pwrd
    const pwrdInPnlAddress = await pnl.pwrd();
    logger.info(`PWRD in PnL : ${pwrdInPnlAddress}`);

    // pnl's gvt
    const gvtInPnlAddress = await pnl.gvt();
    logger.info(`GVT in PnL : ${gvtInPnlAddress}`);

    // insurance
    const insuranceAddress = await controller.insurance();
    logger.info(`insurance : ${insuranceAddress}`);

    // lifeguard
    const lifeguardAddress = await controller.lifeGuard();
    logger.info(`lifeguard : ${lifeguardAddress}`);

    // buoy
    const buoyAddress = await controller.buoy();
    logger.info(`buoy : ${buoyAddress}`);

    // withdrawHandler
    const withdrawHandlerAddress = await controller.withdrawHandler();
    logger.info(`withdrawHandler : ${withdrawHandlerAddress}`);
    const withdrawHandler = new ethers.Contract(
        withdrawHandlerAddress,
        withdrawHandlerABI,
        provider
    );
    // withdrawHandler's pwrd
    const pwrdInWithdrawHandlerAddress = await withdrawHandler.pwrd();
    logger.info(`PWRD in WithdrawHandler : ${pwrdInWithdrawHandlerAddress}`);

    // withdrawHandler's gvt
    const gvtInWithdrawHandlerAddress = await withdrawHandler.gvt();
    logger.info(`GVT in WithdrawHandler : ${gvtInWithdrawHandlerAddress}`);

    // depositHandler
    const depositHandlerAddress = await controller.depositHandler();
    logger.info(`depositHandler : ${depositHandlerAddress}`);
    const depositHandler = new ethers.Contract(
        depositHandlerAddress,
        depositHandlerABI,
        provider
    );
    // depositHandler's pwrd
    const pwrdInDepositHandlerAddress = await depositHandler.pwrd();
    logger.info(`PWRD in DepositHandler : ${pwrdInDepositHandlerAddress}`);

    // depositHandler's gvt
    const gvtInDepositHandlerAddress = await depositHandler.gvt();
    logger.info(`GVT in DepositHandler : ${gvtInDepositHandlerAddress}`);

    // PWRD
    const pwrdAddress = await controller.gToken(true);
    logger.info(`PWRD : ${pwrdAddress}`);

    // GRO Vault
    const groVaultAddress = await controller.gToken(false);
    logger.info(`GVT : ${groVaultAddress}`);

    // reward
    const rewardAddress = await controller.reward();
    logger.info(`reward : ${rewardAddress}`);
}

export {
    getDeployedContracts,
};
