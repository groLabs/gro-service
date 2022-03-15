require('dotenv').config();
export const registry_address = '0x4801de71ECabF5B85D3a51c461fcE657aa93f50f';
export const staker = {
    address: '0x2E32bAd45a1C29c1EA27cf4dD588DF9e68ED376C',
    start_block: 14268775,
};
export const vesting = {
    address: '0x748218256AfE0A19a88EBEB2E0C5Ce86d2178360',
    start_block: 14268760,
};
export const airdrop = {
    address: '0xF3d39A7FEbA9bE0C1D18b355E7eD01070Ee2c561',
    start_block: 14268737,
    folder: '../airdrop',
    gas_pwrd: 'airdrop1_result.csv',
    files: [
        'airdrop-7-proofs.json',
        'airdrop-8-proofs.json',
        'airdrop-9-proofs.json',
        'airdrop-10-proofs.json',
    ],
};
export const gro_gate = {
    folder: '../grogate',
    files: [process.env.AVAX_BOUNCER_PROOF_FILE],
};
export const buoy_start_block = 13304056;
export const blockchain = {
    network: 'mainnet',
    start_block: 12522788,
    avax_start_block: 7726890,
    start_timestamp: 1622204347,
    avax_launch_timestamp: 1638483222,
    alchemy_api_keys: {
        default: process.env[`ALCHEMY_KEY_${process.env.BOT_ENV}`],
        stats_personal: process.env.ALCHEMY_KEY_STATS_PERSONAL,
        stats_gro: process.env.ALCHEMY_KEY_STATS_GRO,
    },
    infura_api_keys: {
        default: {
            projectId:
                process.env[`INFURA_KEY_${process.env.BOT_ENV}_PROJECT_ID`],
            projectSecret:
                process.env[`INFURA_KEY_${process.env.BOT_ENV}_PROJECT_SECRET`],
        },
        stats_personal: {
            projectId: process.env.INFURA_KEY_STATS_PERSONAL_PROJECT_ID,
            projectSecret: process.env.INFURA_KEY_STATS_PERSONAL_PROJECT_SECRET,
        },
        stats_gro: {
            projectId: process.env.INFURA_KEY_STATS_GRO_PROJECT_ID,
            projectSecret: process.env.INFURA_KEY_STATS_GRO_PROJECT_SECRET,
        },
    },
    keystores: {
        default: {
            file_path: process.env[`KEY_STORE_${process.env.BOT_ENV}`],
            password: process.env[`KEY_PASSWORD_${process.env.BOT_ENV}`],
            private_key: process.env[`BOT_PRIVATE_KEY_${process.env.BOT_ENV}`],
        },
        regular: {
            fast_file_path: process.env.KEY_STORE_REGULAR_FAST_GAS,
            fast_password: process.env.KEY_PASSWORD_REGULAR_FAST_GAS,
            fast_private_key: process.env.BOT_PRIVATE_KEY_REGULAR_FAST_GAS,
        },
        critical: {
            fast_file_path: process.env.KEY_STORE_CRITICAL_FAST_GAS,
            fast_password: process.env.KEY_PASSWORD_CRITICAL_FAST_GAS,
            fast_private_key: process.env.BOT_PRIVATE_KEY_CRITICAL_FAST_GAS,
        },
    },
};
export const trigger_scheduler = {
    pending_transaction_check: '5 30 * * * *',
    bot_balance_check: '10 00 * * * *',
    invest: '00 10 * * * *',
    harvest: '15 20 * * * *',
    pnl: '30 30 * * * *',
    rebalance: '45 40 * * * *',
    generate_stats: '00 */5 * * * *',
    remove_stats_file: '00 00 * * * *',
    bot_curve_check: '00 */5 * * * *',
    deposit_withdraw_event: '30 */5 * * * *',
    event_summary: '00 * * * *',
    bot_chainlink_check: '00 00 * * * *',
    safety_check: '*/5 * * * *',
};
export const emoji = {
    company: '<:GRO:834796096685211689>',
    regularBot: ':control_knobs:',
    criticalBot: ':ambulance:',
    statsBot: ':control_knobs:',
    error: ':x:',
    gvt: '<:Vault:834796096797802507>',
    pwrd: '<:PWRD:834796096915767306>',
    miniStatsPersonal: '<:graph:842393056321077299>',
    stats: '<:graph:842393056321077299>',
    depositEvent: '<:deposit:842398612846936074>',
    withdrawEvent: '<:withdraw:842398612873019402>',
    transferEvent: ':arrow_right:',
    reverted: ':warning:',
    investTrigger: ':inbox_tray:',
    curveInvestTrigger: ':inbox_tray:',
    invest: ':inbox_tray:',
    curveInvest: ':inbox_tray:',
    harvestTrigger: ':hammer_pick:',
    harvest: ':hammer_pick:',
    pnlTrigger: ':moneybag:',
    pnl: ':moneybag:',
    rebalanceTrigger: ':scales:',
    rebalance: ':scales:',
    curveCheck: ':loudspeaker:',
};
export const transaction_long_pending = {
    invest: 86400000,
    investToCurveVault: 86400000,
    strategyHarvest: 86400000,
    execPnL: 60000,
    rebalance: 60000,
};
export const keep_stats_file_number = 250;
export const stats_folder = '../stats/mainnet';
export const log_folder = '../logs';
export const blockNumberFile = '../stats/mainnet/lastBlockNumber.json';
export const stats_latest = '../stats/mainnet/gro-latest.json';
export const pendingTransactionFile = '../pendingTransaction.json';
export const vault_name = [
    'DAI yVault',
    'USDC yVault',
    'USDT yVault',
    'Curve yVault',
];
export const vault_display_name = ['DAI', 'USDC', 'USDT', '3CRVUSDx'];
export const stable_coin = ['DAI', 'USDC', 'USDT'];
export const strategy_name = [
    'Lev Comp',
    'Cream',
    'Lev Comp',
    'Cream',
    'Idle',
    'Cream',
    'XPool',
];
export const strategy_display_name = [
    'Lev Comp - DAI',
    'CREAM - DAI',
    'Lev Comp - USDC',
    'CREAM - USDC',
    'Idle - USDT',
    'CREAM - USDT',
    'Curve - XPool',
];
export const strategy_default_apy = [
    106000, 41334, 98500, 49956, 45343, 49513, 117589,
];
export const harvest_strategy_dependency = [
    '0xab7FA2B2985BCcfC13c6D86b1D5A17486ab1e04C',
    '0xf0358e8c3CD5Fa238a29301d0bEa3D63A17bEdBE',
    '0x053c80eA73Dc6941F518a68E2FC52Ac45BDE7c9C',
];
export const cream_strategy_dependency = [
    '0x92B767185fB3B04F881e3aC8e5B0662a027A1D9f',
    '0x44fbebd2f576670a6c33f6fc0b00aa8c5753b322',
    '0x797AAB1ce7c01eB727ab980762bA88e7133d2157',
];
export const curve_strategy_dependency = {
    yearn: '0x1B5eb1173D2Bf770e50F10410C9a96F7a8eB6e75',
    curve: '0x7Eb40E450b9655f4B3cC4259BCC731c63ff55ae6',
};
export const health_endpoint = {
    stats: process.env.STATS_BOT_HEALTH,
    critic: process.env.CRITICAL_BOT_HEALTH,
    harvest: process.env.REGULAR_BOT_HEALTH,
};
export const lifeguard_name = '3CRV';
export const ratioUpperBond = 14000;
export const ratioLowerBond = 7000;
export const curveRatioLowerBond = 1000;
export const before_block = 30;
export const fail_percentage_total = 1000;
export const fail_percentage_pre_price = 500;
export const contracts = {
    controller: '0xCC5c60A319D33810b9EaB9764717EeF84deFB8F4',
    votingAggregator: '0x2c57F9067E50E819365df7c5958e2c4C14A91C2D',
};
export const staker_pools = {
    contracts: {
        gro_address: '0x3Ec8798B81485A254928B70CDA1cf0A2BB0B74D7',
        staker_address: '0x2E32bAd45a1C29c1EA27cf4dD588DF9e68ED376C',
        gro_price_oracle_address: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
        uniswap_gro_gvt_pool_address:
            '0x2ac5bC9ddA37601EDb1A5E29699dEB0A5b67E9bB',
        pwrd_usdc_lp_address: '0xbcb91E689114B9Cc865AD7871845C95241Df4105',
        uniswap_gro_usdc_pool_address:
            '0x21C5918CcB42d20A2368bdCA8feDA0399EbfD2f6',
        curve_pwrd3crv_pool_address:
            '0xbcb91E689114B9Cc865AD7871845C95241Df4105',
        curve_3pool_address: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
        curve_3crv_address: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
        balancer_gro_weth_pool_address:
            '0x702605f43471183158938c1a3e5f5a359d7b31ba',
    },
    single_staking_100_gro_0: {
        deposit_url: 'NA',
        remove_url: 'NA',
        display_order: '1',
        pid: '0',
        disable: 'false',
    },
    uniswap_v2_5050_gro_gvt_1: {
        deposit_url:
            'https://app.uniswap.org/#/add/v2/0x3Ec8798B81485A254928B70CDA1cf0A2BB0B74D7/0x3ADb04E127b9C0a5D36094125669d4603AC52a0c',
        remove_url:
            'https://app.uniswap.org/#/remove/v2/0x3Ec8798B81485A254928B70CDA1cf0A2BB0B74D7/0x3ADb04E127b9C0a5D36094125669d4603AC52a0c',
        display_order: '2',
        pid: '1',
        disable: 'false',
        start_block: 13318236,
    },
    uniswap_v2_5050_gro_usdc_2: {
        deposit_url:
            'https://app.uniswap.org/#/add/v2/0x3Ec8798B81485A254928B70CDA1cf0A2BB0B74D7/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        remove_url:
            'https://app.uniswap.org/#/remove/v2/0x3Ec8798B81485A254928B70CDA1cf0A2BB0B74D7/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        display_order: '3',
        pid: '2',
        disable: 'false',
        start_block: 13327380,
    },
    single_staking_100_gvt_3: {
        deposit_url: 'NA',
        remove_url: 'NA',
        display_order: '4',
        pid: '3',
        disable: 'false',
    },
    curve_meta_pwrd_3crv_4: {
        deposit_url: 'https://curve.fi/factory/44/deposit',
        remove_url: 'https://curve.fi/factory/44/withdraw',
        display_order: '5',
        pid: '4',
        disable: 'false',
        start_block: 13314356,
    },
    balancer_v2_8020_gro_weth_5: {
        deposit_url:
            'https://app.balancer.fi/#/pool/0x702605f43471183158938c1a3e5f5a359d7b31ba00020000000000000000009f',
        remove_url: 'NA',
        display_order: '0',
        pid: '5',
        disable: 'false',
        start_block: 13355180,
        bal_per_week: 1000,
    },
    single_staking_100_pwrd_6: {
        deposit_url: 'NA',
        remove_url: 'NA',
        display_order: '6',
        pid: '6',
        disable: 'false',
    },
};
export const discord = {
    token: process.env[`DISCORD_TOKEN_${process.env.BOT_ENV}`],
    retry: 3,
    channel: {
        trades: '840219146277093456',
        protocol_assets: '840219248915120148',
        protocol_events: '840219356860514405',
        crit_action_events: '840219422509760522',
        bot_alerts: '840219078185713705',
        bot_logs: '840219541488402473',
    },
};
export const database = {
    host: process.env.DB_PROD_HOST,
    port: process.env.DB_PROD_PORT,
    user: process.env.DB_PROD_USER,
    password: process.env.DB_PROD_PASSWORD,
    database: process.env.DB_PROD_INSTANCE,
};
export const route = {
    gro_stats: {
        hostname: 'h4sk4iwj75.execute-api.eu-west-2.amazonaws.com',
        path: '/stats/gro_stats?network=mainnet',
        port: 443,
    },
    gro_stats_mc: {
        path: '/stats/gro_stats_mc?network=mainnet',
    },
    historical_gro_stats: {
        hostname: 'h4sk4iwj75.execute-api.eu-west-2.amazonaws.com',
        path: '/stats/historical_gro_stats',
        port: 443,
    },
    personal_stats: {
        hostname: 'h4sk4iwj75.execute-api.eu-west-2.amazonaws.com',
        path: '/stats/gro_personal_position?network=mainnet&address=',
        port: 443,
    },
    db_bot: {
        hostname: 'https://h4sk4iwj75.execute-api.eu-west-2.amazonaws.com',
        path: 'database/gro_bonus_claimed?network=mainnet&address=',
    },
};
export const lbp = {
    // Balancer V2 LBP: GRO LBP
    start_block: 13289180,
    start_timestamp: 1632496215,
    lbp_start_date: 1632844800,
    lbp_end_date: 1633104000,
    lbp_gro_start_weight: 0.95,
    lbp_gro_end_weight: 0.5,
    gro_amount_total: 5000000,
    usdc_amount_total: 2650000,
    balancerV2_graph_url:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
    balancerV2_pool_address: '0x64e2c43cA952BA01E32E8cFA05c1E009Bc92E06c',
    balancerV2_pool_id:
        '0x64e2c43ca952ba01e32e8cfa05c1e009bc92e06c00020000000000000000009b',
    // Balancer V1 (Not used)
    gro_token: '0xD348b1F5872940901fcAF9aCD1b9785f4e12121A',
    coin_token: '0x9edF2989C22C5bF6675a4581E39D75a3C9BF8578',
    bp_pool: '0x86fa758a31ba14d1beea4a79eece71c2329d004b',
    crp_pool: '0xade0c1536e2053328b53a7b41b32289bce2cf65d',
};
export const subgraph = {
    uniswapV2_graph_url:
        'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
    uniswapV2_pair_id_gro_usdc: '0x21c5918ccb42d20a2368bdca8feda0399ebfd2f6',
    uniswapV2_pair_id_gvt_gro: '0x2ac5bc9dda37601edb1a5e29699deb0a5b67e9bb',
    balancerV2_graph_url:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
    balancerV2_pool_id_gro_weth:
        '0x702605f43471183158938c1a3e5f5a359d7b31ba00020000000000000000009f',
};
export const argentWalletDetector = {
    address: '0xeca4B0bDBf7c55E9b7925919d03CbF8Dc82537E8',
};
