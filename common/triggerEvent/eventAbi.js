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

module.exports = {
    pnlABI,
    stableCoinABI,
};
