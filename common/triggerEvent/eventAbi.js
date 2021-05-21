const pnlABI = {
    key: 'LogPnLExecution(uint256,int256,int256,int256,uint256,uint256,uint256,uint256,uint256,uint256)',
    dataSignature: [
        'uint256',
        'int256',
        'int256',
        'int256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
    ],
    abi: [
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'deductedAssets',
                    type: 'uint256',
                },
                {
                    indexed: false,
                    internalType: 'int256',
                    name: 'totalPnL',
                    type: 'int256',
                },
                {
                    indexed: false,
                    internalType: 'int256',
                    name: 'investPnL',
                    type: 'int256',
                },
                {
                    indexed: false,
                    internalType: 'int256',
                    name: 'pricePnL',
                    type: 'int256',
                },
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'withdrawalBonus',
                    type: 'uint256',
                },
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'performanceBonus',
                    type: 'uint256',
                },
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'beforeGvtAssets',
                    type: 'uint256',
                },
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'beforePwrdAssets',
                    type: 'uint256',
                },
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'afterGvtAssets',
                    type: 'uint256',
                },
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'afterPwrdAssets',
                    type: 'uint256',
                },
            ],
            name: 'LogPnLExecution',
            type: 'event',
        },
    ],
};

const stableCoinABI = {
    key: 'Transfer(address,address,uint256)',
    dataSignature: ['uint256'],
    abi: [
        {
            anonymous: false,
            inputs: [
                {
                    indexed: true,
                    internalType: 'address',
                    name: 'src',
                    type: 'address',
                },
                {
                    indexed: true,
                    internalType: 'address',
                    name: 'dst',
                    type: 'address',
                },
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'wad',
                    type: 'uint256',
                },
            ],
            name: 'Transfer',
            type: 'event',
        },
    ],
};

const harvestABI = {
    key: 'Harvested(uint256,uint256,uint256,uint256)',
    dataSignature: ['uint256', 'uint256', 'uint256', 'uint256'],
    abi: [
        {
            anonymous: false,
            inputs: [
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'profit',
                    type: 'uint256',
                },
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'loss',
                    type: 'uint256',
                },
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'debtPayment',
                    type: 'uint256',
                },
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'debtOutstanding',
                    type: 'uint256',
                },
            ],
            name: 'Harvested',
            type: 'event',
        },
    ],
};

const reportABI = {
    key: 'StrategyReported(address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)',
    dataSignature: [
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
    ],
    abi: [
        {
            name: 'StrategyReported',
            inputs: [
                {
                    type: 'address',
                    name: 'strategy',
                    indexed: true,
                },
                {
                    type: 'uint256',
                    name: 'gain',
                    indexed: false,
                },
                {
                    type: 'uint256',
                    name: 'loss',
                    indexed: false,
                },
                {
                    type: 'uint256',
                    name: 'debtPaid',
                    indexed: false,
                },
                {
                    type: 'uint256',
                    name: 'totalGain',
                    indexed: false,
                },
                {
                    type: 'uint256',
                    name: 'totalLoss',
                    indexed: false,
                },
                {
                    type: 'uint256',
                    name: 'totalDebt',
                    indexed: false,
                },
                {
                    type: 'uint256',
                    name: 'debtAdded',
                    indexed: false,
                },
                {
                    type: 'uint256',
                    name: 'debtRatio',
                    indexed: false,
                },
            ],
            anonymous: false,
            type: 'event',
        },
    ],
};

module.exports = {
    pnlABI,
    stableCoinABI,
    harvestABI,
    reportABI,
};
