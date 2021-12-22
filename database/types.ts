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

// For deposit, withdrawal & transfer events
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
    DEPOSIT_USDCe = 20,
    WITHDRAWAL_USDCe = 21,
    TRANSFER_USDCe_IN = 22,
    TRANSFER_USDCe_OUT = 23,
    DEPOSIT_USDTe = 24,
    WITHDRAWAL_USDTe = 25,
    TRANSFER_USDTe_IN = 26,
    TRANSFER_USDTe_OUT = 27,
    DEPOSIT_DAIe = 28,
    WITHDRAWAL_DAIe = 29,
    TRANSFER_DAIe_IN = 30,
    TRANSFER_DAIe_OUT = 31,
    STABLECOIN_APPROVAL = 100,
};

enum Bool {
    FALSE = 0,
    TRUE = 1,
}

// For multicall
enum ReturnType {
    UINT = 0,
    BOOL = 1,
    ADDRESS = 2,
    UINT_UINT = 3,
    arrUINT_arrUINT_arrUINT = 4,
    arrUINT_arrUINT_arrarrUINT = 5,
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
    ReturnType,
}
