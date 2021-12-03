const { BigNumber } = require('ethers');
const {
    getRouter,
    getWavax,
    getCrToken,
} = require('../contract/avaxAllContracts');
const { getConfig } = require('../../dist/common/configUtil');
const { sendTransaction } = require('../common/avaxChainUtil');
const {
    forceCloseMessage,
    updateLimitMessage,
} = require('../../discordMessage/avaxMessage');

const logger = require('../avaxharvestLogger');

const E18 = BigNumber.from('1000000000000000000');
const PERCENT_DECIMAL = BigNumber.from('1000000');
const LIMIT_FACTOR = BigNumber.from(getConfig('limit_factor'));
const CLOSE_THRESHOLD = BigNumber.from(getConfig('force_close_threshold'));
const CHAINLINK_DECIMAL = BigNumber.from('100000000');
const UPPER = BigNumber.from(1020000);
const LOWER = BigNumber.from(980000);

async function getBorrowInfo() {
    const crToken = getCrToken();
    const totalSupply = await crToken.totalSupply();
    logger.info(`totalSupply ${totalSupply}`);

    const exchangeRateStored = await crToken.exchangeRateStored();
    logger.info(`exchangeRateStored ${exchangeRateStored}`);

    const totalBorrows = await crToken.totalBorrows();
    logger.info(`totalBorrows ${totalBorrows}`);

    const totalAvailable = totalSupply.mul(exchangeRateStored).div(E18);
    logger.info(`totalAvailable ${totalAvailable}`);

    return {
        totalBorrows,
        totalAvailable,
    };
}

async function borrowLimit(vault) {
    const { stableCoin, ahStrategy, vaultName } = vault;
    const wavax = getWavax();
    const router = getRouter();
    const borrowInfo = await getBorrowInfo();
    const openPositionId = await ahStrategy.activePosition();
    logger.info(`openPositionId ${vaultName} ${openPositionId}`);
    let wantOpen = BigNumber.from(0);
    if (openPositionId > 0) {
        const positionData = await ahStrategy.getPosition(openPositionId);
        logger.info(
            `openPositionId ${vaultName} ${openPositionId} ${positionData[0]} ${positionData[1]} ${positionData[2]}`
        );
        wantOpen = positionData[2][1];
    }
    const availableAmount = borrowInfo.totalAvailable.sub(
        borrowInfo.totalBorrows.sub(wantOpen)
    );
    logger.info(`availableAmount ${availableAmount}`);
    const newBorrowLimit = availableAmount
        .mul(LIMIT_FACTOR)
        .div(PERCENT_DECIMAL);
    logger.info(`newBorrowLimit ${newBorrowLimit}`);
    const checkResult = await router.getAmountsOut(E18, [
        wavax.address,
        stableCoin.address,
    ]);
    logger.info(`checkResult address ${wavax.address} ${stableCoin.address}`);

    const newBorrowLimitWant = newBorrowLimit.mul(checkResult[1]).div(E18);
    logger.info(`newBorrowLimitWant ${newBorrowLimitWant}`);

    const currentLimit = await ahStrategy.borrowLimit();

    const diff = currentLimit.mul(PERCENT_DECIMAL).div(newBorrowLimitWant);

    logger.info(`diff ${diff}`);

    if (diff.gt(UPPER) || diff.lt(LOWER)) {
        logger.info('out of range, will not run setLimit');
        return;
    }

    const tx = await sendTransaction(ahStrategy, 'setBorrowLimit', [
        newBorrowLimitWant,
    ]);
    updateLimitMessage({ transactionHash: tx.transactionHash });
}

async function forceClose(vault) {
    try {
        const { ahStrategy, stableCoin, vaultName } = vault;
        const wavax = getWavax();
        const router = getRouter();
        const borrowInfo = await getBorrowInfo();
        const openPositionId = await ahStrategy.activePosition();
        logger.info(`openPositionId ${vaultName} ${openPositionId}`);
        if (openPositionId > 0) {
            logger.info(
                `borrowInfo.totalBorrows ${vaultName} ${borrowInfo.totalBorrows}`
            );

            const utilizationRatio = borrowInfo.totalBorrows
                .mul(PERCENT_DECIMAL)
                .div(borrowInfo.totalAvailable);
            logger.info(`utilizationRatio ${vaultName} ${utilizationRatio}`);

            if (utilizationRatio.gt(CLOSE_THRESHOLD)) {
                logger.info(
                    `need call ${vaultName} force close ${utilizationRatio} > ${CLOSE_THRESHOLD}`
                );
                const checkResult = await router.getAmountsOut(E18, [
                    wavax.address,
                    stableCoin.address,
                ]);

                const tx = await sendTransaction(ahStrategy, 'forceClose', [
                    openPositionId,
                    checkResult[0],
                    checkResult[1],
                ]);

                forceCloseMessage({ transactionHash: tx.transactionHash });
            }
        }
    } catch (e) {
        logger.error(e);
    }
}

module.exports = {
    borrowLimit,
    forceClose,
};
