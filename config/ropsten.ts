require('dotenv').config();
export const registry_address = '0x5dF979799065F9c10860Ce3E2ac3e62627c6A3A5';
export const staker = {
    address: '0x53C1F46b1584Fc4D0b51a6B19D45151e974B3f7B',
    start_block: 11091289,
};
export const vesting = {
    address: '0xAbCe0853782181c82B8b55c4B922E16BE6132C28',
    start_block: 11091286,
};
export const airdrop = {
    address: '0x5CbA95DC6FcdF68b085086315886b2c9dB9b8960',
    start_block: 11226281,
    folder: '../airdrop',
    gas_pwrd: 'airdrop1_result.csv',
    files: [
        'airdrop-0-proofs.json',
        'airdrop-1-proofs.json',
        'airdrop-2-proofs.json',
    ],
};
export const gro_gate = {
    folder: '../grogate',
    files: [process.env.AVAX_BOUNCER_PROOF_FILE],
};

export const buoy_start_block = 10633347;
export const blockchain = {
    network: 'ropsten',
    avalanche_rpc_url:
        'https://eth-ropsten.alchemyapi.io/v2/kstyjc0ZezPVmz6QoyR0YqNzSjv9zXxO',
    start_block: 10525267,
    avax_start_block: 7726890,
    start_timestamp: 1624827717,
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
            low_file_path: process.env.KEY_STORE_REGULAR_LOW_GAS,
            low_password: process.env.KEY_PASSWORD_REGULAR_LOW_GAS,
            low_private_key: process.env.BOT_PRIVATE_KEY_REGULAR_LOW_GAS,
            standard_file_path: process.env.KEY_STORE_REGULAR_STANDARD_GAS,
            standard_password: process.env.KEY_PASSWORD_REGULAR_STANDARD_GAS,
            standard_private_key:
                process.env.BOT_PRIVATE_KEY_REGULAR_STANDARD_GAS,
            fast_file_path: process.env.KEY_STORE_REGULAR_FAST_GAS,
            fast_password: process.env.KEY_PASSWORD_REGULAR_FAST_GAS,
            fast_private_key: process.env.BOT_PRIVATE_KEY_REGULAR_FAST_GAS,
            rapid_file_path: process.env.KEY_STORE_REGULAR_RAPID_GAS,
            rapid_password: process.env.KEY_PASSWORD_REGULAR_RAPID_GAS,
            rapid_private_key: process.env.BOT_PRIVATE_KEY_REGULAR_RAPID_GAS,
        },
        critical: {
            rapid_file_path: process.env.KEY_STORE_CRITICAL_RAPID_GAS,
            rapid_password: process.env.KEY_PASSWORD_CRITICAL_RAPID_GAS,
            rapid_private_key: process.env.BOT_PRIVATE_KEY_REGULAR_CRITICAL_GAS,
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
    safety_check: '*/2 * * * *',
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
    invest: 120000,
    investToCurveVault: 120000,
    strategyHarvest: 120000,
    execPnL: 60000,
    rebalance: 60000,
};
export const keep_stats_file_number = 250;
export const stats_folder = '../stats/ropsten';
export const log_folder = '../logs';
export const blockNumberFile = '../stats/ropsten/lastBlockNumber.json';
export const stats_latest = '../stats/ropsten/gro-latest.json';
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
export const ratioUpperBond = 14000;
export const ratioLowerBond = 7000;
export const curveRatioLowerBond = 1000;
export const lifeguard_name = '3CRV';
export const before_block = 30;
export const fail_percentage_total = 1000;
export const fail_percentage_pre_price = 500;
export const contracts = {
    controller: '0x8A59743BBC178063BE23603B39059e1DFE9edD22',
};
export const staker_pools = {
    contracts: {
        gro_address: '0x9892fff05b42adc940c251ca879d912dfa94c731',
        staker_address: '0xCD72ccA707C61C2d7361F99B6c66bC312dB50BF7',
        gro_price_oracle_address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        uniswap_gro_gvt_pool_address:
            '0x02910bC117C6F1E7347aEF1A8e94a0B45041EF3F',
        pwrd_usdc_lp_address: '0x0f1801f97eb62ee5dbf2b809aed75a6f1223694a',
        uniswap_gro_usdc_pool_address:
            '0x45078a6dc55299D1cE68f624cE564eee80E644DB',
        curve_pwrd3crv_pool_address:
            '0x613081F24c4d5D797dca6480ccA67611224d7f41',
        curve_3pool_address: '0x930e1D35BeF80A1FF7Cb70DcFf295Ed97D187c58',
        curve_3crv_address: '0xF92594660CAE88FC36C63d542266eA57575a08BC',
        balancer_gro_weth_pool_address:
            '0x702605f43471183158938c1a3e5f5a359d7b31ba',
    },
    single_staking_100_gro_0: {
        deposit_url: 'NA',
        remove_url: 'NA',
        display_order: '1',
        pid: '1',
        disable: 'false',
    },
    uniswap_v2_5050_gro_gvt_1: {
        deposit_url:
            'https://app.uniswap.org/#/add/v2/0x4394be2135357833A9e18D5A73B2a0C629efE984/0x9892fFf05B42AdC940C251cA879D912Dfa94c731',
        remove_url:
            'https://app.uniswap.org/#/remove/v2/0x4394be2135357833A9e18D5A73B2a0C629efE984/0x9892fFf05B42AdC940C251cA879D912Dfa94c731',
        display_order: '2',
        pid: '0',
        disable: 'false',
        start_block: 11117850,
    },
    uniswap_v2_5050_gro_usdc_2: {
        deposit_url:
            'https://app.uniswap.org/#/add/v2/0xa553cda420072a759ac352dca4cec70709829614/0x9892fFf05B42AdC940C251cA879D912Dfa94c731',
        remove_url:
            'https://app.uniswap.org/#/remove/v2/0xa553cda420072a759ac352dca4cec70709829614/0x9892fFf05B42AdC940C251cA879D912Dfa94c731',
        display_order: '3',
        pid: '6',
        disable: 'false',
        start_block: 11136489,
    },
    single_staking_100_gvt_3: {
        deposit_url: 'NA',
        remove_url: 'NA',
        display_order: '4',
        pid: '2',
        disable: 'false',
    },
    curve_meta_pwrd_3crv_4: {
        deposit_url: 'NA',
        remove_url: 'NA',
        display_order: '5',
        pid: '3',
        disable: 'false',
        start_block: 11124360,
    },
    // Only mainnet (data from subgraphs)
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
};
export const discord = {
    token: process.env[`DISCORD_TOKEN_${process.env.BOT_ENV}`],
    retry: 3,
    channel: {
        trades: '826415202160476201',
        protocol_assets: '826415552355762208',
        protocol_events: '826416102522355712',
        crit_action_events: '826416230898466826',
        bot_alerts: '826417081003671582',
        bot_logs: '826416451744825404',
    },
};
export const database = {
    host: process.env.DB_DEV_HOST,
    port: process.env.DB_DEV_PORT,
    user: process.env.DB_DEV_USER,
    password: process.env.DB_DEV_PASSWORD,
    database: process.env.DB_DEV_INSTANCE,
};
export const route = {
    gro_stats: {
        hostname: process.env.BOT_DEV_HOST,
        path: '/stats/gro_stats?network=ropsten',
        port: process.env.BOT_DEV_PORT,
    },
    gro_stats_mc: {
        path: '/stats/gro_stats_mc?network=ropsten',
    },
    historical_gro_stats: {
        hostname: process.env.BOT_DEV_HOST,
        path: '/stats/historical_gro_stats',
        port: process.env.BOT_DEV_PORT,
    },
    personal_stats: {
        hostname: process.env.BOT_DEV_HOST,
        path: '/stats/gro_personal_position?network=ropsten&address=',
        port: process.env.BOT_DEV_PORT,
    },
};
export const subgraph = {
    uniswapV2_graph_url:
        'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
    uniswapV2_pair_id_gro_usdc: '0x45078a6dc55299D1cE68f624cE564eee80E644DB',
    uniswapV2_pair_id_gvt_gro: '0x02910bC117C6F1E7347aEF1A8e94a0B45041EF3F',
    balancerV2_graph_url:
        'https://thegraph.com/legacy-explorer/subgraph/balancer-labs/balancer-v2',
    balancerV2_pool_id_gro_weth:
        '0x702605f43471183158938c1a3e5f5a359d7b31ba00020000000000000000009f',
};
export const argentWalletDetector = {
    address: '0xF230cF8980BaDA094720C01308319eF192F0F311',
}