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
        const callCostWithPrice = gasCost.mul(gasPrice);
        const harvestTrigger = await ahStrategy.harvestTrigger(
            callCostWithPrice
        );
        logger.info(`${vaultName} harvestTrigger ${harvestTrigger}`);
        if (harvestTrigger) {
            // 1. get balance of want in vaultAdaptor and startegy
            // const balanceOfWantInVaultAdaptor = await stableCoin.balanceOf(
            //     vaultAdaptorMK2.address
            // );
            // logger.info(
            //     `balanceOfWantInVaultAdaptor ${balanceOfWantInVaultAdaptor}`
            // );

            // // 2. get wantOpen in strategy
            // const openPositionId = await ahStrategy.activePosition();
            // let wantOpen = BigNumber.from(0);
            // if (openPositionId > 0) {
            //     const positionData = await ahStrategy.positions(openPositionId);
            //     wantOpen = positionData.wantOpen[0];
            // }
            // logger.info(`wantOpen ${wantOpen}`);

            // // 3. calculate max of above
            // const check = balanceOfWantInVaultAdaptor.gt(wantOpen)
            //     ? balanceOfWantInVaultAdaptor
            //     : wantOpen;
            // logger.info(`check ${check}`);

            // 4. get minAmount - 0.5 %
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
