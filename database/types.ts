enum Network {
    MAINNET = 'mainnet',
    ROPSTEN = 'ropsten',
    RINKEBY = 'rinkeby',
    GOERLI = 'goerli',
    KOVAN = 'kovan',
    AVALANCHE = 'avalanche',
}

enum NetworkId {
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
    DEPOSIT = 1,
    WITHDRAWAL = 2,
    TRANSFER_GVT_IN = 3,
    TRANSFER_PWRD_IN = 4,  // TODO: PWRD_OUT
    TRANSFER_GVT_OUT = 5,
    TRANSFER_PWRD_OUT = 6,
    TRANSFER_GRO_IN = 7,
    TRANSFER_GRO_OUT = 8,
    TRANSFER_groUSDCe_IN = 9,
    TRANSFER_groUSDCe_OUT = 10,
    TRANSFER_groUSDTe_IN = 11,
    TRANSFER_groUSDTe_OUT = 12,
    TRANSFER_groDAIe_IN = 13,
    TRANSFER_groDAIe_OUT = 14,
    STABLECOIN_APPROVAL = 20,
};

enum Bool {
    FALSE = 0,
    TRUE = 1,
}

export {
    Network,
    NetworkId,
    Product,
    ProductId,
    Load,
    Transfer,
    Bool,
}
