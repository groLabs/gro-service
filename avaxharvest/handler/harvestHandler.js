const { BigNumber } = require('ethers');
const {
    getRouter,
    getWavax,
    getAvaxAggregator,
    getJoeToken,
} = require('../contract/avaxAllContracts');
const { harvestMessage } = require('../../dist/discordMessage/harvestMessage');
const { borrowLimit } = require('./borrowLimitHandler');
const { sendTransaction } = require('../common/avaxChainUtil');
const logger = require('../avaxharvestLogger');
const { updateLimitMessage } = require('../../dist/discordMessage/avaxMessage');
const E18 = BigNumber.from('1000000000000000000');

async function harvest(vault) {
    try {
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
        const avaxAggregator = getAvaxAggregator();
        const joeToken = getJoeToken();
        const latestBlock = await ahStrategy.signer.provider.getBlock('latest');
        let running = {};
        console.log(`latestBlock ${latestBlock.number}`);
        const blockTag = {
            blockTag: latestBlock.number,
        };
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
            // const txBL = await ahStrategy.setBorrowLimit(0);
            // await txBL.wait();
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
            // const openPositionId = await ahStrategy.activePosition();
            // if (openPositionId > 0) {
            //     const volatilityCheck = await ahStrategy.volatilityCheck(
            //         blockTag
            //     );
            //     logger.info(`volatilityCheck ${volatilityCheck}`);
            // const volatilityCheck = true;

            // 2. sanity check of chainlink and uni
            // if (volatilityCheck) {
            //     logger.info(
            //         `start volatilityCheck ${vaultName} ${volatilityCheck}`
            //     );
            //     const stableCoinDecimal = await stableCoin.decimals();
            //     logger.info(
            //         `stableCoinDecimal ${vaultName} ${stableCoinDecimal}`
            //     );

            //     const avaxPriceInChainlink =
            //         await avaxAggregator.latestAnswer(blockTag);
            //     logger.info(
            //         `avaxPriceInChainlink  ${vaultName} ${avaxPriceInChainlink}`
            //     );
            //     const oneStableCoin =
            //         BigNumber.from(10).pow(stableCoinDecimal);
            //     const uniRatio = await router.getAmountsOut(E18, [
            //         wavax.address,
            //         stableCoin.address,
            //         blockTag,
            //     ]);
            //     logger.info(`uniRatio ${uniRatio[0]} ${uniRatio[1]}`);
            //     const avaxPriceInUni = uniRatio[1]
            //         .mul(CHAINLINK_DECIMAL)
            //         .mul(E18)
            //         .div(uniRatio[0])
            //         .div(oneStableCoin);
            //     logger.info(`avaxPriceInUni ${avaxPriceInUni}`);

            //     const diff = avaxPriceInChainlink
            //         .mul(PERCENT_DECIMAL)
            //         .div(avaxPriceInUni);

            //     logger.info(`diff ${diff}`);

            //     if (diff.gt(UPPER) || diff.lt(LOWER)) {
            //         logger.info('out of range, will not run tend');
            //         return;
            //     }
            // }
            // }

            // dai:
            // [stableCoin, joe], [avaxMinAmount, avaxMinAmount]
            // usdc/usdt:
            // [avax, joe], [stableCoinMinAmount, stableCoinMinAmount]
            const tokens = [];
            const minAmounts = [];
            if (vaultName === 'New DAI.e yVault') {
                const path1 = [stableCoin.address, wavax.address];
                const path2 = [
                    joeToken.address,
                    wavax.address,
                    stableCoin.address,
                ];
                const stableCoinToWavax = await router.getAmountsOut(
                    decimals,
                    path1
                );

                const joeToStableCoin = await router.getAmountsOut(E18, path2);

                minAmounts[0] = stableCoinToWavax[1]
                    .mul(BigNumber.from(990))
                    .div(BigNumber.from(1000));
                tokens[0] = stableCoin.address;

                minAmounts[1] = joeToStableCoin[1]
                    .mul(BigNumber.from(990))
                    .div(BigNumber.from(1000));

                tokens[1] = joeToken.address;
                logger.info(
                    `amm check ${vaultName} ${stableCoinToWavax[1]} ${joeToStableCoin[1]} ${minAmounts}`
                );
            } else {
                const path1 = [wavax.address, stableCoin.address];
                const path2 = [joeToken.address, stableCoin.address];
                const wavaxToStableCoin = await router.getAmountsOut(
                    E18,
                    path1
                );

                const joeToStableCoin = await router.getAmountsOut(E18, path2);

                minAmounts[0] = wavaxToStableCoin[1]
                    .mul(BigNumber.from(990))
                    .div(BigNumber.from(1000));
                tokens[0] = wavax.address;

                minAmounts[1] = joeToStableCoin[1]
                    .mul(BigNumber.from(990))
                    .div(BigNumber.from(1000));
                tokens[1] = joeToken.address;

                logger.info(
                    `amm check ${vaultName} ${wavaxToStableCoin[1]} ${joeToStableCoin[1]} - ${minAmounts}`
                );
            }
            if (!running[vaultName]) {
                running[vaultName] = true;
                // await vaultAdaptorMK2.strategyHarvest(0, tokens, minAmounts);
                const tx = await sendTransaction(
                    vaultAdaptorMK2,
                    'strategyHarvest',
                    [0, tokens, minAmounts]
                );
                running[vaultName] = false;
                harvestMessage({
                    vaultName,
                    strategyName,
                    vaultAddress: vaultAdaptorMK2.address,
                    transactionHash: tx.transactionHash,
                    strategyAddress: ahStrategy.address,
                });
            } else {
                logger.info(`harvest tx of ${vaultName} is running`);
            }
        }
    } catch (e) {
        logger.error(e);
    }
}

module.exports = {
    harvest,
};
