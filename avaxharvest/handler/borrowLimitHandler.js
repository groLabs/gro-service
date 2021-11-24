const { BigNumber } = require('ethers');
const {
    getRouter,
    getWavax,
    getCrToken,
} = require('../contract/avaxAllContracts');
const { getConfig } = require('../../dist/common/configUtil');
const {
    syncManagerNonce,
    sendTransaction,
} = require('../common/avaxChainUtil');
const {
    forceCloseMessage,
    updateLimitMessage,
} = require('../../discordMessage/avaxMessage');

const logger = require('../avaxharvestLogger');

const E18 = BigNumber.from('1000000000000000000');
const PERCENT_DECIMAL = BigNumber.from('1000000');
const LIMIT_FACTOR = BigNumber.from(getConfig('limit_factor'));
const CLOSE_THRESHOLD = BigNumber.from(getConfig('force_close_threshold'));

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
    const { stableCoin, ahStrategy } = vault;
    const wavax = getWavax();
    const router = getRouter();
    const borrowInfo = await getBorrowInfo();
    const openPositionId = ahStrategy.activePosition();
    let wantOpen = BigNumber.from(0);
    if (openPositionId > 0) {
        const positionData = await ahStrategy.positions(openPositionId);
        wantOpen = positionData.wantOpen[0];
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

    await syncManagerNonce();
    const tx = await sendTransaction(ahStrategy, 'setBorrowLimit', [
        newBorrowLimitWant,
    ]);
    await tx.wait();
    updateLimitMessage({ transactionHash: tx.hash });
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
                const checkResult = router.getAmountsOut(E18, [
                    wavax.address,
                    stableCoin.address,
                ]);
                await syncManagerNonce();
                const tx = await sendTransaction(ahStrategy, 'forceClose', [
                    openPositionId,
                    checkResult[0],
                    checkResult[1],
                ]);

                await tx.wait();
                forceCloseMessage({ transactionHash: tx.hash });
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
