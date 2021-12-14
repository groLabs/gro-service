const { BigNumber } = require('ethers');
const {
    getRouter,
    getWavax,
    getCrToken,
    getJoeToken,
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
const AH_CREDIT = BigNumber.from(100000).mul(E18);
const UPPER = BigNumber.from(1050000);
const LOWER = BigNumber.from(950000);
const FORCE_CLOSE_RANGE = [10 * 3600, 14 * 3600];

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

async function setBorrowLimit(vault) {
    try {
        const { stableCoin, ahStrategy, vaultAdaptorMK2, vaultName, decimal } =
            vault;
        const currentLimit = await ahStrategy.borrowLimit();
        logger.info(`currentLimit ${currentLimit}`);
        const wavax = getWavax();
        const router = getRouter();
        const latestBlock = await ahStrategy.signer.provider.getBlock('latest');
        console.log(`latestBlock ${latestBlock.number}`);
        const blockTagNow = {
            blockTag: latestBlock.number,
        };
        const blockTagOneMinAgo = {
            blockTag: latestBlock.number - 1000,
        };
        const borrowInfo = await getBorrowInfo(blockTagNow);
        const borrowInfoBefore = await getBorrowInfo(blockTagOneMinAgo);
        const availableOneMinAgo = borrowInfoBefore.totalAvailable.sub(
            borrowInfoBefore.totalBorrows
        );
        const checkResult = await router.getAmountsOut(E18, [
            wavax.address,
            stableCoin.address,
        ]);

        logger.info(
            `checkResult address ${wavax.address} ${stableCoin.address}`
        );
        const available = borrowInfo.totalAvailable.sub(
            borrowInfo.totalBorrows
        );
        logger.info(`available ${available} AH_CREDIT ${AH_CREDIT}`);
        let newBorrowLimit = AH_CREDIT.mul(LIMIT_FACTOR).div(PERCENT_DECIMAL);
        if (available.gte(AH_CREDIT)) {
            if (availableOneMinAgo.gte(AH_CREDIT)) {
                logger.info(
                    `No need update borrowLimit. available ${available} availableOneMinAgo ${availableOneMinAgo} AH_CREDIT ${AH_CREDIT}`
                );
                return;
            }
        }
        if (available.lt(AH_CREDIT)) {
            const current = await ahStrategy.borrowLimit();
            newBorrowLimit = available.mul(LIMIT_FACTOR).div(PERCENT_DECIMAL);
            const want = newBorrowLimit.mul(checkResult[1]).div(E18);
            const diff = want.mul(PERCENT_DECIMAL).div(current);
            logger.info(
                `Borrow limit change ${current} -> ${want} ratio ${diff}`
            );
            logger.info(`diff ${diff}`);
            if (diff.lte(UPPER) && diff.gte(LOWER)) {
                logger.info(
                    `No need update borrowLimit. No big borrow limit change ${current} -> ${newBorrowLimit} ratio ${diff}`
                );
                return;
            }
        }

        const newBorrowLimitWant = newBorrowLimit.mul(checkResult[1]).div(E18);
        logger.info(
            `newBorrowLimit ${newBorrowLimit} newBorrowLimitWant ${newBorrowLimitWant}`
        );
        const tx = await sendTransaction(ahStrategy, 'setBorrowLimit', [
            newBorrowLimitWant,
        ]);
        updateLimitMessage({ transactionHash: tx.transactionHash });
    } catch (e) {
        logger.error(e);
    }
}

async function getEvents(filter, contractInterface, provider) {
    const filterLogs = await provider.getLogs(filter).catch((error) => {
        logger.error(error);
        return [];
    });

    const logs = [];
    filterLogs.forEach((log) => {
        const eventInfo = {
            address: log.address,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
        };
        const parseResult = contractInterface.parseLog(log);
        eventInfo.name = parseResult.name;
        eventInfo.signature = parseResult.signature;
        eventInfo.topic = parseResult.topic;
        eventInfo.args = parseResult.args;
        logs.push(eventInfo);
    });

    return logs;
}

async function fetchTimestamp(provider, transaction) {
    const { blockNumber } = transaction;
    const blockData = await provider.getBlock(parseInt(blockNumber, 10));
    transaction.timestamp = blockData.timestamp;
    return transaction;
}

async function appendEventTimestamp(provider, transactions) {
    const promise = [];
    for (let i = 0; i < transactions.length; i += 1) {
        promise.push(fetchTimestamp(provider, transactions[i]));
    }
    await Promise.all(promise);
}

async function getPositionOpenEvents(ahStrategy, endBlock, positionId) {
    console.log(`ahStrategy address ${ahStrategy.address}`);
    const filter = ahStrategy.filters.LogNewPositionOpened(positionId);
    filter.fromBlock = endBlock - 129000;
    filter.toBlock = endBlock;
    console.log(`start ${filter.fromBlock} end ${endBlock}`);
    const logs = await getEvents(
        filter,
        ahStrategy.interface,
        ahStrategy.provider
    );
    // console.log(`logs.length ${logs.length}`);
    await appendEventTimestamp(ahStrategy.signer.provider, logs);
    const positionsOpened = {};
    logs.forEach((item) => {
        const openInfo = {
            block: item.blockNumber,
            positionId: item.args[0],
            price: item.args[1],
            collateralSize: item.args[2],
            debts: item.args[3],
            timestamp: item.timestamp,
        };
        positionsOpened[`${item.args[0]}`] = openInfo;
        // console.log(`positionId ${item.args[0]}`);
        // console.log(`price ${item.args[1]}`);
        // console.log(`collateralSize ${item.args[2]}`);
        // console.log(`debts ${item.args[3]}`);
    });
    return positionsOpened;
}

function getRandomDuration() {
    return (
        Math.random() * (FORCE_CLOSE_RANGE[1] - FORCE_CLOSE_RANGE[0]) +
        FORCE_CLOSE_RANGE[0]
    );
}

async function forceClose(vault) {
    try {
        console.log('call force close');
        const { ahStrategy, stableCoin, vaultName, decimals } = vault;
        const wavax = getWavax();
        const router = getRouter();
        const joeToken = getJoeToken();
        const openPositionId = await ahStrategy.activePosition();
        logger.info(`openPositionId ${vaultName} ${openPositionId}`);
        if (openPositionId > 0) {
            const latestBlock = await ahStrategy.signer.provider.getBlock(
                'latest'
            );
            // console.log(`${latestBlock.number}`);
            const openPositionDataEvent = await getPositionOpenEvents(
                ahStrategy,
                latestBlock.number - 1,
                openPositionId
            );
            // console.log(
            //     `position Open time ${JSON.stringify(
            //         openPositionDataEvent[openPositionId].timestamp
            //     )}`
            // );
            const tolerance = getRandomDuration();
            const positionDuration =
                latestBlock.timestamp -
                openPositionDataEvent[openPositionId].timestamp;
            logger.info(
                `forceClose tolerance ${vaultName}  ${tolerance} positionDuration ${positionDuration}`
            );
            if (positionDuration < tolerance) {
                logger.info(
                    `No need force close  ${vaultName} because position duration ${positionDuration} less than ${tolerance}`
                );
                return;
            }
            const tokens = [];
            const minAmounts = [];
            if (vaultName === 'DAI yVault') {
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
                    `amm check ${vaultName} ${wavaxToStableCoin[1]} ${joeToStableCoin[1]} ${minAmounts}`
                );
            }

            const tx = await sendTransaction(ahStrategy, 'forceClose', [
                openPositionId,
                tokens,
                minAmounts,
            ]);

            forceCloseMessage({ transactionHash: tx.transactionHash });
        }
    } catch (e) {
        logger.error(e);
    }
}

module.exports = {
    setBorrowLimit,
    forceClose,
};
