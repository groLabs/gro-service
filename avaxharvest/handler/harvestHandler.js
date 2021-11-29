const { BigNumber } = require('ethers');
const { getRouter, getWavax } = require('../contract/avaxAllContracts');
const { harvestMessage } = require('../../dist/discordMessage/harvestMessage');
const { borrowLimit } = require('./borrowLimitHandler');
const { sendTransaction } = require('../common/avaxChainUtil');
const logger = require('../avaxharvestLogger');
const E18 = BigNumber.from('1000000000000000000');

async function harvest(vault) {
    try {
        await borrowLimit(vault);
        const {
            stableCoin,
            vaultAdaptorMK2,
            ahStrategy,
            gasCost,
            vaultName,
            strategyName,
            decimals,
        } = vault;
        const router = getRouter();
        const wavax = getWavax();
        const gasPrice = await vaultAdaptorMK2.signer.getGasPrice();
        logger.info(`gasPrice ${gasCost} ${gasPrice}`);
        // const callCostWithPrice = gasCost.mul(gasPrice);
        const callCostWithPrice = BigNumber.from(5000);
        const harvestTrigger = await ahStrategy.harvestTrigger(
            callCostWithPrice
        );
        logger.info(`harvestTrigger ${vaultName} ${harvestTrigger}`);
        const balVault = await stableCoin.balanceOf(vaultAdaptorMK2.address);
        const balStrategy = await stableCoin.balanceOf(ahStrategy.address);
        logger.info(`assets in ${vaultName} ${balVault} ${balStrategy}`);

        const openPositionId = await ahStrategy.activePosition();
        if (openPositionId > 0) {
            const positionData = await ahStrategy.getPosition(openPositionId);
            logger.info(
                `wantOpen ${vaultName} ${positionData.wantOpen[0]} ${positionData.wantOpen[1]}`
            );
            logger.info(`totalClose ${vaultName} ${positionData.totalClose}`);
            logger.info(`collId ${vaultName} ${positionData.collId}`);
            logger.info(`collateral ${vaultName} ${positionData.collateral}`);

            const pendingYield = await ahStrategy.pendingYieldToken(
                openPositionId
            );
            logger.info(`pendingYield ${vaultName} ${pendingYield}`);
        }
        if (harvestTrigger) {
            const checkResult = await router.getAmountsOut(decimals, [
                stableCoin.address,
                wavax.address,
            ]);
            logger.info(
                `amm check ${vaultName} ${checkResult[0]} ${checkResult[1]}`
            );

            const tx = await sendTransaction(
                vaultAdaptorMK2,
                'strategyHarvest',
                [0, checkResult[0], checkResult[1]]
            );
            harvestMessage({
                vaultName,
                strategyName,
                vaultAddress: vaultAdaptorMK2.address,
                transactionHash: tx.transactionHash,
                strategyAddress: ahStrategy.address,
            });
        }
    } catch (e) {
        logger.error(e);
    }
}

module.exports = {
    harvest,
};
