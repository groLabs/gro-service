const QUERY_ERROR = 400;
const QUERY_SUCCESS = 200;
const ERC20_TRANSFER_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const BALANCES_BATCH = 750;

// Restrict eligible tables to extract data when called from API
const TABLE_WHITELIST = [
    'MD_STABLECOINS',
    'PROTOCOL_PRICE_CHECK_DETAILED',
];

enum NETWORK {
    MAINNET = 'mainnet',
    ROPSTEN = 'ropsten',
    RINKEBY = 'rinkeby',
    GOERLI = 'goerli',
    KOVAN = 'kovan',
    AVALANCHE = 'avalanche',
}

enum NETWORK_ID {
    MAINNET = 1,
    ROPSTEN = 3,
    RINKEBY = 4,
    GOERLI = 5,
    KOVAN = 42,
    AVALANCHE = 43114,
}

enum PRODUCT {
    PWRD = 'pwrd',
    GVT = 'gvt',
    GRO = 'gro',
}

enum PRODUCT_ID {
    PWRD = 1,
    GVT = 2,
    GRO = 3,
}

export {
    QUERY_ERROR,
    QUERY_SUCCESS,
    ERC20_TRANSFER_SIGNATURE,
    TABLE_WHITELIST,
    BALANCES_BATCH,
    NETWORK,
    NETWORK_ID,
    PRODUCT,
    PRODUCT_ID,
}

