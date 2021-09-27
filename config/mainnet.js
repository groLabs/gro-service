module.exports = {
    deposit_handler_history: {
        '0x79b14d909381D79B655C0700d0fdc2C7054635b9': {
            abi: 'old',
            event_fragment: [
                'event LogNewDeposit(address indexed user, address indexed referral, bool pwrd, uint256 usdAmount, uint256[] tokens)',
            ],
        },
        '0x9da6ad743F4F2A247A56350703A4B501c7f2C224': {},
        '0xB7207Ea9446DcA1dEC1c1FC93c6Fcdf8B4a44F40': {},
    },
    withdraw_handler_history: {
        '0xd89512Bdf570476310DE854Ef69D715E0e85B09F': {
            abi: 'old',
            event_fragment: [
                'event LogNewWithdrawal(address indexed user, address indexed referral, bool pwrd, bool balanced, bool all, uint256 deductUsd, uint256 returnUsd, uint256 lpAmount, uint256[] tokenAmounts)',
            ],
        },
        '0x59B6b763509198d07cF8F13a2dc6F2df98CB0a1d': {},
        '0x641bEFA4dB601578A64F0Fc1f4E89E9869268Fe7': {},
    },
    old_pnl: [
        '0x4C4A81298CC85c5BBF8092bd241fCc5dD6Ec3f74',
        '0xc94dDeACff69bd206CEDdFe2b601a277225D23D6',
    ],
    buoy_start_block: 13304056,
    blockchain: {
        network: 'mainnet',
        start_block: 12522788,
        start_timestamp: 1622204347,
        default_api_keys: {
            alchemy: process.env[`ALCHEMY_KEY_${process.env.BOT_ENV}`],
            infura: 'a0c4911f680a4dd0bf3f7dfac2a4ba08',
            etherscan: 'VZS5J2DM4XZM254GMESMWN3F49TNS7TU9H',
            pocket: '8dbbeecc2126c14cbc48bf6b66f4a33850fa3537',
        },
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
                    process.env[
                        `INFURA_KEY_${process.env.BOT_ENV}_PROJECT_SECRET`
                    ],
            },
            stats_personal: {
                projectId: process.env.INFURA_KEY_STATS_PERSONAL_PROJECT_ID,
                projectSecret:
                    process.env.INFURA_KEY_STATS_PERSONAL_PROJECT_SECRET,
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
                private_key:
                    process.env[`BOT_PRIVATE_KEY_${process.env.BOT_ENV}`],
            },
            regular: {
                low_file_path: process.env.KEY_STORE_REGULAR_LOW_GAS,
                low_password: process.env.KEY_PASSWORD_REGULAR_LOW_GAS,
                low_private_key: process.env.BOT_PRIVATE_KEY_REGULAR_LOW_GAS,
                standard_file_path: process.env.KEY_STORE_REGULAR_STANDARD_GAS,
                standard_password:
                    process.env.KEY_PASSWORD_REGULAR_STANDARD_GAS,
                standard_private_key:
                    process.env.BOT_PRIVATE_KEY_REGULAR_STANDARD_GAS,
                fast_file_path: process.env.KEY_STORE_REGULAR_FAST_GAS,
                fast_password: process.env.KEY_PASSWORD_REGULAR_FAST_GAS,
                fast_private_key: process.env.BOT_PRIVATE_KEY_REGULAR_FAST_GAS,
                rapid_file_path: process.env.KEY_STORE_REGULAR_RAPID_GAS,
                rapid_password: process.env.KEY_PASSWORD_REGULAR_RAPID_GAS,
                rapid_private_key:
                    process.env.BOT_PRIVATE_KEY_REGULAR_RAPID_GAS,
            },
            critical: {
                rapid_file_path: process.env.KEY_STORE_CRITICAL_RAPID_GAS,
                rapid_password: process.env.KEY_PASSWORD_CRITICAL_RAPID_GAS,
                rapid_private_key:
                    process.env.BOT_PRIVATE_KEY_REGULAR_CRITICAL_GAS,
            },
        },
    },
    trigger_scheduler: {
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
    },
    emoji: {
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
    },
    transaction_long_pending: {
        invest: 120000,
        investToCurveVault: 120000,
        strategyHarvest: 120000,
        execPnL: 60000,
        rebalance: 60000,
    },
    keep_stats_file_number: 250,
    stats_folder: '../stats',
    log_folder: '../logs',
    blockNumberFile: '../stats/lastBlockNumber.json',
    stats_latest: '../stats/gro-latest.json',
    vault_name: ['DAI yVault', 'USDC yVault', 'USDT yVault', 'Curve yVault'],
    vault_display_name: ['DAI', 'USDC', 'USDT', '3CRVUSDx'],
    stable_coin: ['DAI', 'USDC', 'USDT'],
    strategy_name: [
        'Lev Comp',
        'Cream',
        'Lev Comp',
        'Cream',
        'Idle',
        'Cream',
        'XPool',
    ],
    strategy_display_name: [
        'Lev Comp - DAI',
        'CREAM - DAI',
        'Lev Comp - USDC',
        'CREAM - USDC',
        'Idle - USDT',
        'CREAM - USDT',
        'Curve - XPool',
    ],
    strategy_default_apy: [106000, 41334, 98500, 49956, 45343, 49513, 117589],
    harvest_strategy_dependency: [
        '0xab7FA2B2985BCcfC13c6D86b1D5A17486ab1e04C',
        '0xf0358e8c3CD5Fa238a29301d0bEa3D63A17bEdBE',
        '0x053c80eA73Dc6941F518a68E2FC52Ac45BDE7c9C',
    ],
    cream_strategy_dependency: [
        '0x92B767185fB3B04F881e3aC8e5B0662a027A1D9f',
        '0x44fbebd2f576670a6c33f6fc0b00aa8c5753b322',
        '0x797AAB1ce7c01eB727ab980762bA88e7133d2157',
    ],
    curve_strategy_dependency: {
        yearn: '0x1B5eb1173D2Bf770e50F10410C9a96F7a8eB6e75',
        curve: '0x7Eb40E450b9655f4B3cC4259BCC731c63ff55ae6',
    },
    health_endpoint: {
        stats: process.env.STATS_BOT_HEALTH,
        critic: process.env.CRITICAL_BOT_HEALTH,
        harvest: process.env.REGULAR_BOT_HEALTH,
    },
    lifeguard_name: '3CRV',
    ratioUpperBond: 14000,
    ratioLowerBond: 7000,
    curveRatioLowerBond: 1000,
    before_block: 30,
    fail_percentage_total: 1000,
    fail_percentage_pre_price: 500,
    contracts: {
        controller: '0xCC5c60A319D33810b9EaB9764717EeF84deFB8F4',
    },
    discord: {
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
    },
    database: {
        host: process.env.DB_PROD_HOST,
        port: process.env.DB_PROD_PORT,
        user: process.env.DB_PROD_USER,
        password: process.env.DB_PROD_PASSWORD,
        database: process.env.DB_PROD_INSTANCE,
    },
    route: {
        gro_stats: {
            hostname: 'h4sk4iwj75.execute-api.eu-west-2.amazonaws.com',
            path: '/stats/gro_stats?network=mainnet',
            port: 443,
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
    },
    lbp: {
        // Balancer V2 LBP: GRO LBP
        start_block: 13289180,
        start_timestamp: 1632496215,    // Friday, 24 September 2021 15:10:15
        lbp_start_date: 1632844800,     // Tuesday, 28 September 2021 16:00:00
        lbp_end_date: 1633104000,       // Friday, 1 October 2021 16:00:00
        lbp_gro_start_weight: 0.95,     // GRO start weight: 95%
        lbp_gro_end_weight: 0.5,        // GRO end weight: 50%
        gro_amount_total: 5000000,      // GRO initial balance: 5M
        usdc_amount_total: 2650000,     // USDC initial balance: 2,65M
        balancerV2_graph_url: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
        balancerV2_pool_address: '0x64e2c43cA952BA01E32E8cFA05c1E009Bc92E06c',
        balancerV2_pool_id: '0x64e2c43ca952ba01e32e8cfa05c1e009bc92e06c00020000000000000000009b',
        // Balancer V1 (Not used)
        gro_token: '0xD348b1F5872940901fcAF9aCD1b9785f4e12121A',
        coin_token: '0x9edF2989C22C5bF6675a4581E39D75a3C9BF8578',
        bp_pool: '0x86fa758a31ba14d1beea4a79eece71c2329d004b',
        crp_pool: '0xade0c1536e2053328b53a7b41b32289bce2cf65d',
    },
};
