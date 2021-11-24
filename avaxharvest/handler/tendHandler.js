const { BigNumber } = require('ethers');
const {
    getRouter,
    getWavax,
    getAvaxAggregator,
} = require('../contract/avaxAllContracts');
const {
    syncManagerNonce,
    sendTransaction,
} = require('../common/avaxChainUtil');
const { borrowLimit } = require('./borrowLimitHandler');

const { getConfig } = require('../../dist/common/configUtil');
const { tendMessage } = require('../../discordMessage/avaxMessage');
const logger = require('../avaxharvestLogger');

const CHAINLINK_DECIMAL = BigNumber.from('100000000');
const PERCENT_DECIMAL = BigNumber.from('1000000');
const E18 = BigNumber.from('1000000000000000000');
const UPPER = BigNumber.from(1020000);
const LOWER = BigNumber.from(980000);

async function tend(vault) {
    try {
        await syncManagerNonce();
        await borrowLimit(vault);
        const { stableCoin, ahStrategy, gasCost, vaultName } = vault;
        const router = getRouter();
        const wavax = getWavax();
        const avaxAggregator = getAvaxAggregator();

        const activePosition = await ahStrategy.activePosition();

        if (activePosition.isZero()) {
            logger.info(
                `Vault name: ${vaultName}, activePosition: ${activePosition}, directly return.`
            );
            return;
        }

        const gasPrice = await ahStrategy.signer.getGasPrice();
        const callCostWithPrice = gasCost.mul(gasPrice);
        logger.info(
            `gasPrice ${gasPrice}, callCostWithPrice: ${callCostWithPrice}`
        );
        const tendTrigger = await ahStrategy.tendTrigger(callCostWithPrice);

        logger.info(
            `Vault name: ${vaultName}, tendTrigger: ${tendTrigger}, activePosition: ${activePosition}`
        );
        if (tendTrigger) {
            // 1. get balance of want in vaultAdaptor and startegy
            const volatilityCheck = await ahStrategy.volatilityCheck();
            logger.info(`volatilityCheck ${volatilityCheck}`);
            // const volatilityCheck = true;

            // 2. sanity check of chainlink and uni
            if (volatilityCheck) {
                logger.info(
                    `start volatilityCheck ${vaultName} ${volatilityCheck}`
                );
                const stableCoinDecimal = await stableCoin.decimals();
                logger.info(
                    `stableCoinDecimal ${vaultName} ${stableCoinDecimal}`
                );

                const avaxPriceInChainlink =
                    await avaxAggregator.latestAnswer();
                logger.info(
                    `avaxPriceInChainlink  ${vaultName} ${avaxPriceInChainlink}`
                );
                const oneStableCoin = BigNumber.from(10).pow(stableCoinDecimal);
                const uniRatio = await router.getAmountsOut(E18, [
                    wavax.address,
                    stableCoin.address,
                ]);
                logger.info(`uniRatio ${uniRatio[0]} ${uniRatio[1]}`);
                const avaxPriceInUni = uniRatio[1]
                    .mul(CHAINLINK_DECIMAL)
                    .mul(E18)
                    .div(uniRatio[0])
                    .div(oneStableCoin);
                logger.info(`avaxPriceInUni ${avaxPriceInUni}`);

                const diff = avaxPriceInChainlink
                    .mul(PERCENT_DECIMAL)
                    .div(avaxPriceInUni);

                logger.info(`diff ${diff}`);

                if (diff.gt(UPPER) && diff.lt(LOWER)) {
                    logger.info('out of range, will not run tend');
                    return;
                }
            }
            await syncManagerNonce();
            const tx = await sendTransaction(ahStrategy, 'tend', []);
            await tx.wait();
            tendMessage({ transactionHash: tx.hash });
        }
    } catch (e) {
        logger.error(e);
    }
}

module.exports = {
    tend,
};
