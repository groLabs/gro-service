const QUERY_ERROR = 400;
const QUERY_SUCCESS = 200;
const ERC20_TRANSFER_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const BALANCES_BATCH = 300;

// Restrict eligible tables to extract data when called from API
const TABLE_WHITELIST = [
    'MD_STABLECOINS',
    'PROTOCOL_PRICE_CHECK_DETAILED',
];

// Start block of tokens (only mainnet & for data reloads)
const GENESIS = {
    ETHEREUM: {
        GVT_DEPLOYMENT_BLOCK: 12522788,     // May-28-2021 12:19:07 PM
        GVT_START_OF_DAY_BLOCK: 12519449,   // May-28-2021 12:00:09 AM
        PWRD_DEPLOYMENT_BLOCK: 12522247,    // May-28-2021 10:22:08 AM
        PWRD_START_OF_DAY_BLOCK: 12519449,  // May-28-2021 12:00:09 AM
        GRO_DEPLOYMENT_BLOCK: 13265186,     // Sep-20-2021 09:51:30 PM
        GRO_START_OF_DAY_BLOCK: 13259322,   // Sep-20-2021 12:00:18 AM
    },
    AVALANCHE: {
        VAULT_USDC_1_0_DEPLOYMENT_BLOCK: 7726393,   // Dec-02-2021 09:56:59 PM
        VAULT_USDT_1_0_DEPLOYMENT_BLOCK: 7726828,   // Dec-02-2021 10:11:39 PM
        VAULT_DAI_1_0_DEPLOYMENT_BLOCK: 7727040,    // Dec-02-2021 10:18:41 PM
        VAULTS_1_0_START_OF_DAY_BLOCK: 7687394,     // Dec-02-2021 12:00:03 AM
        VAULT_USDC_1_5_DEPLOYMENT_BLOCK: 8207308,   // Dec-14-2021 01:20:49 AM
        VAULT_USDT_1_5_DEPLOYMENT_BLOCK: 8207453,   // Dec-14-2021 01:25:41 AM
        VAULT_DAI_1_5_DEPLOYMENT_BLOCK: 8207566,    // Dec-14-2021 01:29:27 AM
        VAULTS_1_5_START_OF_DAY_BLOCK: 8204883,     // Dec-14-2021 12:00:00 AM
        VAULT_USDC_1_6_DEPLOYMENT_BLOCK: 9149087,   // Jan-05-2022 02:14:36 AM
        VAULT_USDT_1_6_DEPLOYMENT_BLOCK: 9149594,   // Jan-05-2022 02:31:39 AM
        VAULT_DAI_1_6_DEPLOYMENT_BLOCK: 9149634,    // Jan-05-2022 02:33:01 AM
        VAULTS_1_6_START_OF_DAY_BLOCK: 9145068,     // Jan-05-2022 12:00:01 AM
        VAULT_USDC_1_7_DEPLOYMENT_BLOCK: 9754071,   // Jan-19-2022 12:00:00 AM (9753847: Jan-18-2022 11:52:36 PM, but set to Jan-19 as no tx were done on 18.1.22)
        VAULT_USDT_1_7_DEPLOYMENT_BLOCK: 9754083,   // Jan-19-2022 12:00:20 AM
        VAULT_DAI_1_7_DEPLOYMENT_BLOCK: 9754161,    // Jan-19-2022 12:02:59 AM
        VAULTS_1_7_START_OF_DAY_BLOCK: 9754071,     // Jan-19-2022 12:00:00 AM
    }
}

export {
    QUERY_ERROR,
    QUERY_SUCCESS,
    ERC20_TRANSFER_SIGNATURE,
    TABLE_WHITELIST,
    BALANCES_BATCH,
    GENESIS,
}

