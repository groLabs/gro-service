/* eslint-disable no-await-in-loop */
const { BigNumber } = require('ethers');
const {
    getRouter,
    getWavax,
    getCrToken,
} = require('../contract/avaxAllContracts');
const { getConfig } = require('../../dist/common/configUtil');
const { sendTransaction } = require('../common/avaxChainUtil');
const { updateLimitMessage } = require('../../dist/discordMessage/avaxMessage');

const logger = require('../avaxharvestLogger');

const E18 = BigNumber.from('1000000000000000000');
const PERCENT_DECIMAL = BigNumber.from('1000000');
const LIMIT_FACTOR = BigNumber.from(getConfig('limit_factor'));
const AH_CREDIT = BigNumber.from(100000).mul(E18);
const updateSensitivityThreshold = BigNumber.from(470000);
const ZERO = BigNumber.from(0);

async function getBorrowInfo(blockTag) {
    const crToken = getCrToken(blockTag);
    const totalSupply = await crToken.totalSupply(blockTag);
    logger.info(`totalSupply ${totalSupply}`);

    const exchangeRateStored = await crToken.exchangeRateStored(blockTag);
    logger.info(`exchangeRateStored ${exchangeRateStored}`);

    const totalBorrows = await crToken.totalBorrows(blockTag);
    logger.info(`totalBorrows ${totalBorrows}`);

    const totalAvailable = totalSupply.mul(exchangeRateStored).div(E18);
    logger.info(`totalAvailable ${totalAvailable}`);

    return {
        totalBorrows,
        totalAvailable,
    };
}

async function setSingleVaultBorrowLimit(
    vault,
    isOverBorrowed,
    avaxAvailable,
    blockTag
) {
    try {
        const { stableCoin, ahStrategy, vaultAdaptorMK2, vaultName, decimals } =
            vault;
        const currentLimit = await ahStrategy.borrowLimit();
        const vaultAssets = await vaultAdaptorMK2.totalAssets();
        logger.info(`${vaultName} currentLimit ${currentLimit}`);
        const wavax = getWavax();
        const router = getRouter();
        const latestBlock = await ahStrategy.signer.provider.getBlock('latest');
        console.log(`latestBlock ${latestBlock.number}`);

        const checkResult = await router.getAmountsOut(E18, [
            wavax.address,
            stableCoin.address,
        ]);

        logger.info(
            `${vaultName} checkResult address ${wavax.address} ${stableCoin.address}`
        );
        const openPositionId = await ahStrategy.activePosition(blockTag);
        let borrowed = BigNumber.from(0);
        if (openPositionId > 0) {
            const positionData = await ahStrategy.getPosition(
                openPositionId,
                blockTag
            );
            logger.info(
                `${vaultName} current position want ${positionData.wantOpen[0]} debt ${positionData.wantOpen[1]}`
            );
            [, borrowed] = positionData.wantOpen;
        }
        const safeAvax = borrowed.add(avaxAvailable);
        let newBorrowLimit = AH_CREDIT;
        if (safeAvax.lt(AH_CREDIT)) {
            const current = await ahStrategy.borrowLimit();
            const want = safeAvax.mul(checkResult[1]).div(E18);
            const diff = want.gte(current)
                ? want.sub(current)
                : current.sub(want);
            newBorrowLimit = safeAvax;
            logger.info(
                `${vaultName} Safe ${safeAvax} Borrow limit change ${current} -> ${want} diff ${diff}`
            );
            //(
            // abs(current value - last on-chain update value) > updateSensitivityThreshold
            // AND
            // (
            //   total borrow > total supply * (1-utilisationBuffer)
            //   OR
            //   Lab assets > current borrow limit
            // )
            //)
            logger.info(
                `${vaultName} whether need update the borrowlimit: diff ${diff.gt(
                    updateSensitivityThreshold.mul(decimals)
                )} and (isOverBorrowed ${isOverBorrowed} or ${vaultAssets.gt(
                    current
                )})`
            );
            if (
                !(
                    diff.gt(updateSensitivityThreshold.mul(decimals)) &&
                    (isOverBorrowed || vaultAssets.gt(current))
                )
            ) {
                logger.info(
                    `${vaultName} No need update borrowLimit. No big borrow limit change ${current} -> ${want}`
                );
                return;
            }
        }
        const newBorrowLimitWant = newBorrowLimit.mul(checkResult[1]).div(E18);
        logger.info(
            `${vaultName} newBorrowLimit ${newBorrowLimit} newBorrowLimitWant ${newBorrowLimitWant}`
        );
        const tx = await sendTransaction(ahStrategy, 'setBorrowLimit', [
            newBorrowLimitWant,
        ]);
        updateLimitMessage({ transactionHash: tx.transactionHash });
    } catch (e) {
        logger.error(e);
    }
}

async function setBorrowLimit(vaults) {
    const latestBlock = await vaults[0].ahStrategy.signer.provider.getBlock(
        'latest'
    );
    const tag = {
        blockTag: latestBlock.number,
    };
    const borrowInfo = await getBorrowInfo(tag);
    // total * 0.95
    const avaxBorrowCap = borrowInfo.totalAvailable
        .mul(LIMIT_FACTOR)
        .div(PERCENT_DECIMAL);
    const diff = avaxBorrowCap.sub(borrowInfo.totalBorrows);
    const isOverBorrowed = diff.lt(ZERO);

    const vaultTotalAssetsArray = [];
    let tvl = ZERO;
    for (let i = 0; i < vaults.length; i += 1) {
        const { vaultAdaptorMK2, decimals } = vaults[i];
        // eslint-disable-next-line no-await-in-loop
        const vaultAssets = await vaultAdaptorMK2.totalAssets();
        const vaultAssetsInUsd = vaultAssets.div(decimals);
        vaultTotalAssetsArray[i] = vaultAssetsInUsd;
        tvl = tvl.add(vaultAssetsInUsd);
    }

    const tx = [];
    for (let i = 0; i < vaults.length; i += 1) {
        const avaxAvailable = diff.mul(vaultTotalAssetsArray[i]).div(tvl);
        console.log(
            `${i} capOverBorrowed ${diff} vaultTotalAssetsArray ${vaultTotalAssetsArray[i]} tvl ${tvl} avaxAvailable ${avaxAvailable}`
        );
        tx.push(
            setSingleVaultBorrowLimit(
                vaults[i],
                isOverBorrowed,
                avaxAvailable,
                tag
            )
        );
    }
    await Promise.all(tx);
}

module.exports = {
    setBorrowLimit,
};
