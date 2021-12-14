const { BigNumber } = require('ethers');
const {
    getRouter,
    getWavax,
    getAvaxAggregator,
} = require('../contract/avaxAllContracts');
const { sendTransaction } = require('../common/avaxChainUtil');

const { getConfig } = require('../../dist/common/configUtil');
const { tendMessage } = require('../../dist/discordMessage/avaxMessage');
const logger = require('../avaxharvestLogger');

const CHAINLINK_DECIMAL = BigNumber.from('100000000');
const PERCENT_DECIMAL = BigNumber.from('1000000');
const E18 = BigNumber.from('1000000000000000000');
const UPPER = BigNumber.from(1020000);
const LOWER = BigNumber.from(980000);

async function tend(vault) {
    try {
        const { stableCoin, ahStrategy, gasCost, vaultName } = vault;
        const router = getRouter();
        const wavax = getWavax();
        const avaxAggregator = getAvaxAggregator();
        const gasPrice = await ahStrategy.signer.getGasPrice();
        const latestBlock = await ahStrategy.signer.provider.getBlock('latest');
        console.log(`latestBlock ${latestBlock.number}`);
        const blockTag = {
            blockTag: latestBlock.number,
        };
        const callCostWithPrice = gasCost.mul(gasPrice);
        logger.info(
            `gasPrice ${gasPrice}, callCostWithPrice: ${callCostWithPrice}`
        );
        // const tendTrigger = await ahStrategy.tendTrigger(
        //     callCostWithPrice,
        //     blockTag
        // );
        const tendTrigger = true;
        logger.info(`Vault name: ${vaultName}, tendTrigger: ${tendTrigger}`);
        if (tendTrigger) {
            // 1. get balance of want in vaultAdaptor and startegy
            const volatilityCheck = await ahStrategy.volatilityCheck(blockTag);
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

                const avaxPriceInChainlink = await avaxAggregator.latestAnswer(
                    blockTag
                );
                logger.info(
                    `avaxPriceInChainlink  ${vaultName} ${avaxPriceInChainlink}`
                );
                const oneStableCoin = BigNumber.from(10).pow(stableCoinDecimal);
                const uniRatio = await router.getAmountsOut(E18, [
                    wavax.address,
                    stableCoin.address,
                    blockTag,
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

                if (diff.gt(UPPER) || diff.lt(LOWER)) {
                    logger.info('out of range, will not run tend');
                    return;
                }
            }

            const tx = await sendTransaction(ahStrategy, 'tend', []);
            tendMessage({ transactionHash: tx.transactionHash });
        }
    } catch (e) {
        logger.error(e);
    }
}

module.exports = {
    tend,
};
