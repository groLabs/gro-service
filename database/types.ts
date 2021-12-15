enum GlobalNetwork {
    UNKNOWN = 0,
    ETHEREUM = 1,
    AVALANCHE = 2,
}

enum Network {
    UNKNOWN = 'unknown',
    MAINNET = 'mainnet',
    ROPSTEN = 'ropsten',
    RINKEBY = 'rinkeby',
    GOERLI = 'goerli',
    KOVAN = 'kovan',
    AVALANCHE = 'avalanche',
}

enum NetworkId {
    UNKNOWN = 0,
    MAINNET = 1,
    ROPSTEN = 3,
    RINKEBY = 4,
    GOERLI = 5,
    KOVAN = 42,
    AVALANCHE = 43114,
}

enum Product {
    PWRD = 'pwrd',
    GVT = 'gvt',
    GRO = 'gro',
}

enum ProductId {
    PWRD = 1,
    GVT = 2,
    GRO = 3,
}

enum Load {
    FULL = 1,
    TRANSFERS = 2,
};

enum Transfer {
    // Ethereum
    DEPOSIT = 1,
    WITHDRAWAL = 2,
    TRANSFER_GVT_IN = 3,
    TRANSFER_PWRD_IN = 4,  // TODO: PWRD_OUT
    TRANSFER_GVT_OUT = 5,
    TRANSFER_PWRD_OUT = 6,
    TRANSFER_GRO_IN = 7,
    TRANSFER_GRO_OUT = 8,
    // Avalanche
    DEPOSIT_groUSDCe = 9,
    WITHDRAWAL_groUSDCe = 10,
    TRANSFER_groUSDCe_IN = 11,
    TRANSFER_groUSDCe_OUT = 12,
    TRANSFER_groUSDTe_IN = 13,
    TRANSFER_groUSDTe_OUT = 14,
    TRANSFER_groDAIe_IN = 15,
    TRANSFER_groDAIe_OUT = 16,
    STABLECOIN_APPROVAL = 100,
};

enum Bool {
    FALSE = 0,
    TRUE = 1,
}

export {
    GlobalNetwork,
    Network,
    NetworkId,
    Product,
    ProductId,
    Load,
    Transfer,
    Bool,
}
