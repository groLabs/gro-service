require('dotenv').config();
export const registry_address = '0x3f90622f3df1Fe37e6233A8446A835AB032bb941';
export const deposit_handler_history = {
    '0x79b14d909381D79B655C0700d0fdc2C7054635b9': {
        abi: 'old',
        event_fragment: [
            'event LogNewDeposit(address indexed user, address indexed referral, bool pwrd, uint256 usdAmount, uint256[] tokens)',
        ],
    },
    '0x9da6ad743F4F2A247A56350703A4B501c7f2C224': {},
};
export const withdraw_handler_history = {
    '0xd89512Bdf570476310DE854Ef69D715E0e85B09F': {
        abi: 'old',
        event_fragment: [
            'event LogNewWithdrawal(address indexed user, address indexed referral, bool pwrd, bool balanced, bool all, uint256 deductUsd, uint256 returnUsd, uint256 lpAmount, uint256[] tokenAmounts)',
        ],
    },
    '0x59B6b763509198d07cF8F13a2dc6F2df98CB0a1d': {},
};
export const airdrop = {
    address: '0x6b1bFf72F00cC147b5Dc7A5b156Fe7A6Fd206ddA',
    start_block: 13417433,
    folder: '../airdrop',
    gas_pwrd: 'airdrop1_result.csv',
    files: [
        'airdrop-0-proofs.json',
        'airdrop-1-proofs.json',
        'airdrop-2-proofs.json',
        'airdrop-3-proofs.json',
    ],
};
export const gro_gate = {
    folder: '../grogate',
    files: ['bouncer-3-proofs.json'],
};
export const old_pnl = ['0x4C4A81298CC85c5BBF8092bd241fCc5dD6Ec3f74'];
export const buoy_start_block = 12837080;
export const blockchain = {
    network: 'http://localhost:8545',
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
        avaxharvest: {
            dai_file_path: process.env.KEY_STORE_AVAX_DAI,
            dai_password: process.env.KEY_PASSWORD_AVAX_DAI,
            dai_private_key: process.env.BOT_PRIVATE_KEY_AVAX_DAI,
            usdc_file_path: process.env.KEY_STORE_AVAX_USDC,
            usdc_password: process.env.KEY_PASSWORD_AVAX_USDC,
            usdc_private_key: process.env.BOT_PRIVATE_KEY_AVAX_USDC,
            usdt_file_path: process.env.KEY_STORE_AVAX_USDT,
            usdt_password: process.env.KEY_PASSWORD_AVAX_USDT,
            usdt_private_key: process.env.BOT_PRIVATE_KEY_AVAX_USDT,
        },
    },
};
export const trigger_scheduler = {
    tend: '10 * * * * *',
    harvest: '20 * * * * *',
    force_close: '*/10 * * * * *',
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
    invest: 1800000,
    investToCurveVault: 1800000,
    strategyHarvest: 900000,
    execPnL: 300000,
    rebalance: 120000,
};
export const keep_stats_file_number = 80;
export const stats_folder = '../stats';
export const log_folder = './logs';
export const blockNumberFile = './lastBlockNumber.json';
export const stats_latest = '../stats/gro-latest.json';
export const vault_name = [
    'DAI yVault',
    'USDC yVault',
    'USDT yVault',
    'Curve yVault',
];
export const stable_coin = ['DAI', 'USDC', 'USDT'];
export const strategy_exposure = [
    ['Idle', 'Compound'],
    ['Cream'],
    ['Idle', 'Compound'],
    ['Cream'],
    ['Idle', 'Compound'],
    ['Cream'],
    ['Curve'],
];
export const strategy_name = [
    'Idle',
    'Cream',
    'Idle',
    'Cream',
    'Idle',
    'Cream',
    'XPool',
];
export const strategy_default_apy = [
    58500, 99000, 30700, 65000, 83000, 90278, 200000,
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
export const lifeguard_name = '3CRV';
export const before_block = 30;
export const fail_percentage_total = 1000;
export const fail_percentage_pre_price = 500;
export const contracts = {
    vaults: [
        {
            stable_coin: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
            vault_adaptor: '0x5E57E11483A3F60A76af3045303604522059dA2a',
            strategy: '0x4c7EA5b8032C5Ea82DdF617DAc7972c70E0c0478',
            gas_cost: '1000000',
            wallet_key: 'dai',
            vault_name: 'DAI yVault',
            strategy_name: 'AH',
            decimals: 18,
        },
        // {
        //     stable_coin: '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664',
        //     vault_adaptor: '0x57DaED1ee021BE9991F5d30CF494b6B09B5B449E',
        //     strategy: '0x247AF6E106549033d3a65354fC3A72FF3794FA99',
        //     gas_cost: '1000000',
        //     wallet_key: 'usdc',
        //     vault_name: 'USDC yVault',
        //     strategy_name: 'AH',
        //     decimals: 6,
        // },
        // {
        //     stable_coin: '0xc7198437980c041c805A1EDcbA50c1Ce5db95118',
        //     vault_adaptor: '0x471F4B4b9A97F82C3a25b034B33A8E306eE9Beb5',
        //     strategy: '0x94a7c3419504ceA9FbA06eE739717B236Ada0638',
        //     gas_cost: '1000000',
        //     wallet_key: 'usdt',
        //     vault_name: 'USDT yVault',
        //     strategy_name: 'AH',
        //     decimals: 6,
        // },
    ],
    crtoken: '0xb3c68d69E95B095ab4b33B4cB67dBc0fbF3Edf56',
    avax_aggregator: '0x0A77230d17318075983913bC2145DB16C7366156',
    wavax: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    router: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
    joe: '0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd',
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
    host: process.env.DB_DEV_HOST,
    port: process.env.DB_DEV_PORT,
    user: process.env.DB_DEV_USER,
    password: process.env.DB_DEV_PASSWORD,
    database: process.env.DB_DEV_INSTANCE,
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
