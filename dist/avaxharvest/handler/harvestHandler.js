const { BigNumber, ethers } = require('ethers');
const { harvestMessage } = require('../../dist/discordMessage/avaxMessage');
const { setBorrowLimit } = require('./borrowLimitHandler');
const { sendTransaction } = require('../common/avaxChainUtil');
const logger = require('../avaxharvestLogger');
const WAVAX = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7';
const SWAPPOOLABI = [
    {
        "constant": true,
        "inputs": [],
        "name": "getReserves",
        "outputs": [
            {
                "internalType": "uint112",
                "name": "_reserve0",
                "type": "uint112"
            },
            {
                "internalType": "uint112",
                "name": "_reserve1",
                "type": "uint112"
            },
            {
                "internalType": "uint32",
                "name": "_blockTimestampLast",
                "type": "uint32"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "token0",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "token1",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
];
const bankABI = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "positionId",
                "type": "uint256"
            }
        ],
        "name": "getPositionDebts",
        "outputs": [
            {
                "internalType": "address[]",
                "name": "tokens",
                "type": "address[]"
            },
            {
                "internalType": "uint[]",
                "name": "debts",
                "type": "uint[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];
async function harvest(vault) {
    try {
        await setBorrowLimit(vault);
        const { stableCoin, vaultAdaptorMK2, ahStrategy, gasCost, vaultName, strategyName, decimals, } = vault;
        const latestBlock = await ahStrategy.signer.provider.getBlock('latest');
        const running = {};
        console.log(`latestBlock ${latestBlock.number}`);
        const blockTag = {
            blockTag: latestBlock.number,
        };
        const callCostWithPrice = BigNumber.from(5000);
        const harvestTrigger = await ahStrategy.harvestTrigger(callCostWithPrice);
        logger.info(`harvestTrigger ${vaultName} ${harvestTrigger}`);
        const balVault = await stableCoin.balanceOf(vaultAdaptorMK2.address);
        const balStrategy = await stableCoin.balanceOf(ahStrategy.address);
        logger.info(`assets in ${vaultName} ${balVault} ${balStrategy}`);
        const openPositionId = await ahStrategy.activePosition();
        if (openPositionId > 0) {
            const vc = await ahStrategy.volatilityCheck();
            const positionData = await ahStrategy.getPosition(openPositionId);
            const current = await ahStrategy.borrowLimit();
            logger.info(`wantOpen ${vaultName} ${positionData.wantOpen[0]} ${positionData.wantOpen[1]} `);
            logger.info(`totalClose ${vaultName} ${positionData.totalClose}`);
            logger.info(`collId ${vaultName} ${positionData.collId}`);
            logger.info(`collateral ${vaultName} ${positionData.collateral}`);
        }
        if (harvestTrigger) {
            // dai:
            // [stableCoin, joe], [avaxMinAmount, avaxMinAmount]
            // usdc/usdt:
            // [avax, joe], [stableCoinMinAmount, stableCoinMinAmount]
            if (!running[vaultName]) {
                running[vaultName] = true;
                const tx = await sendTransaction(vaultAdaptorMK2, 'strategyHarvest', [0]);
                running[vaultName] = false;
                harvestMessage({
                    vaultName,
                    strategyName,
                    vaultAddress: vaultAdaptorMK2.address,
                    transactionHash: tx.transactionHash,
                    strategyAddress: ahStrategy.address,
                });
            }
            else {
                logger.info(`harvest tx of ${vaultName} is running`);
            }
        }
    }
    catch (e) {
        logger.error(e);
    }
}
module.exports = {
    harvest,
};
